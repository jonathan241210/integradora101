<?php

namespace App\Actions\Admin\Search\Matching;

/**
 * CA-37 y CA-41 (enmienda 2026-11-18 (d)): un elemento entra si coinciden al menos `minimum()` palabras de la
 * consulta (todas con 1 o 2 palabras; ceil(n/2) con 3 o más). Calcula la relevancia como tupla
 * (CA-50 a CA-53) y el `match` de CA-42.
 *
 * Formato de `relevance` (entero comparable, mayor = más relevante; 9 dígitos decimales `A B C DD EEE F`):
 *  A  1 si el título normalizado es igual a la consulta normalizada (CA-50);
 *  B  2 si el título empieza con la frase completa, 1 si la contiene, 0 si no (CA-51; solo con 2+ palabras);
 *  C  1 si otro campo contiene la frase completa (CA-52; solo con 2+ palabras);
 *  DD palabras de la consulta que coinciden (máx. 99; CA-53);
 *  EEE suma de niveles por palabra (exacta 4, prefijo 3, contiene 2, aproximada 1; máx. 999);
 *  F  peor nivel entre las palabras que coinciden.
 */
final class ItemMatcher
{
    /** Relevancia de una coincidencia solo por identificador exacto (momentos y boletos, CA-29 y CA-31). */
    public const ID_RELEVANCE = 100_010_044;

    /** Palabras vacías: no cuentan como coincidencia (sí forman parte de la frase literal). */
    private const STOP_WORDS = [
        'a', 'al', 'con', 'de', 'del', 'el', 'en', 'es', 'la', 'las', 'lo', 'los', 'o', 'para', 'por',
        'que', 'se', 'su', 'sus', 'un', 'una', 'unas', 'unos', 'y',
    ];

    /** @var list<string> Palabras con contenido que se cuentan y se exigen. */
    private readonly array $content;

    /** @param list<string> $words Palabras de la consulta ya normalizadas. */
    public function __construct(private readonly array $words)
    {
        $content = array_values(array_filter($words, fn (string $word): bool => ! in_array($word, self::STOP_WORDS, true)));
        $this->content = $content === [] ? $words : $content;
    }

    /**
     * Palabras con contenido que deben coincidir: todas con 1 a 3; con 4 o más, al menos 3 y al menos
     * el 75 % (redondeado hacia arriba). Las palabras vacías no se exigen ni se cuentan.
     */
    public function minimum(): int
    {
        $count = count($this->content);

        return $count <= 3 ? $count : max(3, (int) ceil($count * 0.75));
    }

    /**
     * @param  list<array{0: string|null, 1: string|null}>  $fields  Pares [etiqueta, texto]; etiqueta nula = título.
     * @param  string|null  $title  Título del elemento, para la coincidencia literal y de frase (CA-50 y CA-51).
     * @return array{score: int, match: array{field: string, snippet: string}|null}|null
     */
    public function evaluate(array $fields, ?string $title = null): ?array
    {
        if ($this->words === []) {
            return null;
        }

        $prepared = [];
        foreach ($fields as [$label, $text]) {
            if ($text === null || trim($text) === '') {
                continue;
            }
            $collapsed = TextNormalizer::collapse($text);
            $normalized = TextNormalizer::normalize($collapsed);
            $prepared[] = [
                'label' => $label,
                'text' => $collapsed,
                'normalized' => $normalized,
                'tokens' => TextNormalizer::tokens($normalized),
            ];
        }

        $matched = 0;
        $sum = 0;
        $worst = 0;
        $hits = []; // índice de campo => primera coincidencia (la de menor posición).

        foreach ($this->content as $word) {
            $best = 0;
            foreach ($prepared as $index => $field) {
                $found = WordMatcher::match($word, $field['tokens'], $field['normalized']);
                if ($found === null) {
                    continue;
                }
                $best = max($best, $found['level']);
                if (! isset($hits[$index]) || $found['offset'] < $hits[$index]['offset']) {
                    $hits[$index] = $found;
                }
            }
            if ($best > 0) {
                $matched++;
                $sum += $best;
                $worst = $worst === 0 ? $best : min($worst, $best);
            }
        }

        if ($matched < $this->minimum()) {
            return null;
        }

        $phrase = implode(' ', $this->words);
        $normalizedTitle = $title === null ? '' : TextNormalizer::normalize(TextNormalizer::collapse($title));
        $exact = $normalizedTitle !== '' && $normalizedTitle === $phrase ? 1 : 0;
        $titlePhrase = 0;
        $otherPhrase = 0;
        if (count($this->words) >= 2) {
            $position = self::phrasePosition($normalizedTitle, $phrase);
            if ($position !== null) {
                $titlePhrase = $position === 0 ? 2 : 1;
            }
            foreach ($prepared as $field) {
                if ($field['label'] !== null && self::phrasePosition($field['normalized'], $phrase) !== null) {
                    $otherPhrase = 1;
                    break;
                }
            }
        }

        $score = $exact * 100_000_000 + $titlePhrase * 10_000_000 + $otherPhrase * 1_000_000
            + min($matched, 99) * 10_000 + min($sum, 999) * 10 + $worst;

        return ['score' => $score, 'match' => $this->describe($prepared, $hits)];
    }

    /** Posición de la frase en el texto, que debe empezar en el inicio de una palabra; null si no aparece. */
    private static function phrasePosition(string $normalized, string $phrase): ?int
    {
        if ($normalized === '' || preg_match('/(?<![\p{L}\p{N}])'.preg_quote($phrase, '/').'/u', $normalized, $found, PREG_OFFSET_CAPTURE) !== 1) {
            return null;
        }

        return $found[0][1] === 0 ? 0 : 1;
    }

    /**
     * @param  list<array{label: string|null, text: string, normalized: string, tokens: list<array{0: string, 1: int}>}>  $prepared
     * @param  array<int, array{level: int, offset: int, length: int}>  $hits
     * @return array{field: string, snippet: string}|null
     */
    private function describe(array $prepared, array $hits): ?array
    {
        ksort($hits);

        foreach ($hits as $index => $hit) {
            $field = $prepared[$index];
            if ($field['label'] === null) {
                continue; // La coincidencia en el título no genera `match`.
            }

            // La normalización conserva la longitud salvo casos raros de Unicode: entonces se corta desde el inicio.
            $aligned = mb_strlen($field['normalized'], 'UTF-8') === mb_strlen($field['text'], 'UTF-8');

            return [
                'field' => $field['label'],
                'snippet' => MatchSnippet::make($field['text'], $aligned ? $hit['offset'] : 0, $aligned ? $hit['length'] : 0),
            ];
        }

        return null;
    }
}
