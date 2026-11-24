<?php

namespace App\Actions\Admin\Search\Matching;

/** RN-15: minúsculas y sin acentos con una tabla fija (sin ext-intl). */
final class TextNormalizer
{
    private const ACCENTS = [
        'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n',
    ];

    public static function normalize(string $text): string
    {
        return strtr(mb_strtolower($text, 'UTF-8'), self::ACCENTS);
    }

    /** Une cualquier secuencia de espacios en uno solo, para que los fragmentos no lleven saltos de línea. */
    public static function collapse(string $text): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', $text));
    }

    /**
     * Palabras de un texto ya normalizado: secuencias de letras y dígitos, con su posición en caracteres.
     *
     * @return list<array{0: string, 1: int}>
     */
    public static function tokens(string $normalized): array
    {
        if (preg_match_all('/[\p{L}\p{N}]+/u', $normalized, $found, PREG_OFFSET_CAPTURE) === 0) {
            return [];
        }

        $tokens = [];
        foreach ($found[0] as [$word, $byteOffset]) {
            $tokens[] = [$word, mb_strlen(substr($normalized, 0, $byteOffset), 'UTF-8')];
        }

        return $tokens;
    }

    /** Longitud de una palabra: número de letras y dígitos. */
    public static function length(string $word): int
    {
        return (int) preg_match_all('/[\p{L}\p{N}]/u', $word);
    }
}
