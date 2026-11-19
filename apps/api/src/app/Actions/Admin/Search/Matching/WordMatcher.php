<?php

namespace App\Actions\Admin\Search\Matching;

/** CA-38 a CA-40: nivel de coincidencia de una palabra de la consulta contra un campo ya normalizado. */
final class WordMatcher
{
    public const EXACT = 4;

    public const PREFIX = 3;

    public const CONTAINS = 2;

    public const APPROXIMATE = 1;

    private const MIN_CONTAINS_LENGTH = 4;

    /**
     * @param  list<array{0: string, 1: int}>  $tokens  Palabras del campo con su posición.
     * @param  string  $whole  Campo normalizado completo (solo se usa si la palabra lleva signos, CA-32).
     * @return array{level: int, offset: int, length: int}|null Mejor coincidencia y la primera de ese nivel.
     */
    public static function match(string $word, array $tokens, string $whole): ?array
    {
        $length = TextNormalizer::length($word);
        $units = $tokens;

        // Una palabra con signos (`%`, `_`, …) no puede ser un token: se compara literal con el campo completo
        // y sin tolerancia a errores (CA-32).
        $literal = preg_match('/[^\p{L}\p{N}]/u', $word) === 1;
        if ($literal && $whole !== '') {
            $units[] = [$whole, 0];
        }

        $best = null;
        foreach ($units as [$unit, $offset]) {
            $level = 0;
            $at = $offset;

            if ($unit === $word) {
                $level = self::EXACT;
            } elseif (str_starts_with($unit, $word)) {
                $level = self::PREFIX;
            } elseif ($length >= self::MIN_CONTAINS_LENGTH && ($position = mb_strpos($unit, $word)) !== false) {
                $level = self::CONTAINS;
                $at = $offset + $position;
            } elseif (! $literal && self::isTypo($word, $unit, $length)) {
                $level = self::APPROXIMATE;
            }

            if ($level > ($best['level'] ?? 0)) {
                $best = ['level' => $level, 'offset' => $at, 'length' => $level === self::APPROXIMATE ? mb_strlen($unit) : mb_strlen($word)];
            }
        }

        return $best;
    }

    /** CA-39: de 4 a 6 letras admite 1 error; de 7 o más, 2. Menos de 4 letras no admiten errores. */
    private static function isTypo(string $word, string $unit, int $length): bool
    {
        if ($length < 4) {
            return false;
        }

        $allowed = $length >= 7 ? 2 : 1;

        return self::levenshtein($word, $unit, $allowed) <= $allowed;
    }

    /** Levenshtein por caracteres (el nativo cuenta bytes). Devuelve `$limit + 1` si lo supera. */
    public static function levenshtein(string $a, string $b, int $limit): int
    {
        $left = mb_str_split($a, 1, 'UTF-8');
        $right = mb_str_split($b, 1, 'UTF-8');

        if (abs(count($left) - count($right)) > $limit) {
            return $limit + 1;
        }

        $previous = range(0, count($right));
        foreach ($left as $i => $charA) {
            $current = [$i + 1];
            foreach ($right as $j => $charB) {
                $current[$j + 1] = min(
                    $previous[$j + 1] + 1,
                    $current[$j] + 1,
                    $previous[$j] + ($charA === $charB ? 0 : 1),
                );
            }
            $previous = $current;
        }

        return $previous[count($right)];
    }
}
