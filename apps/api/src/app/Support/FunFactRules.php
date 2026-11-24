<?php

namespace App\Support;

use App\Enums\PublishedSpeciesField;
use Illuminate\Validation\ValidationException;

/**
 * Text rules of the public «Dato curioso» (api-026 RN-01, RN-02, RN-07).
 * Plain text: only the outer whitespace is removed; length counts characters.
 */
final class FunFactRules
{
    public const MIN = 20;

    public const MAX = 500;

    public const MIN_MESSAGE = 'Dato curioso: escribe al menos 20 caracteres.';

    public const MAX_MESSAGE = 'Dato curioso: máximo 500 caracteres.';

    public const NOT_TEXT_MESSAGE = 'Dato curioso: texto no válido.';

    public const REPUBLISH_MESSAGE = 'Falta el dato curioso (mínimo 20 caracteres). Complétalo antes de republicar.';

    /** Trimmed text; an empty value is null. */
    public static function normalize(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }

    /** @param  list<string>|null  $publishedFields */
    public static function isSelected(?array $publishedFields): bool
    {
        return in_array(PublishedSpeciesField::FunFact->value, $publishedFields ?? [], true);
    }

    public static function isValidLength(?string $text): bool
    {
        if ($text === null) {
            return false;
        }

        $length = mb_strlen($text);

        return $length >= self::MIN && $length <= self::MAX;
    }

    /**
     * Final value to store (RN-02): the text only survives when the field is selected,
     * and then it must have 20 to 500 characters.
     *
     * @param  list<string>|null  $finalFields
     *
     * @throws ValidationException
     */
    public static function resolve(mixed $text, ?array $finalFields): ?string
    {
        if (! self::isSelected($finalFields)) {
            return null;
        }

        $text = self::normalize($text);

        if ($text === null || mb_strlen($text) < self::MIN) {
            throw ValidationException::withMessages(['fun_fact' => [self::MIN_MESSAGE]]);
        }

        if (mb_strlen($text) > self::MAX) {
            throw ValidationException::withMessages(['fun_fact' => [self::MAX_MESSAGE]]);
        }

        return $text;
    }
}
