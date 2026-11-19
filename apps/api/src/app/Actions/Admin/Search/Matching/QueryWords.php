<?php

namespace App\Actions\Admin\Search\Matching;

/** RN-15: la consulta se normaliza y se divide por espacios. */
final class QueryWords
{
    /** @return list<string> */
    public static function from(string $term): array
    {
        $words = preg_split('/\s+/u', TextNormalizer::normalize($term), -1, PREG_SPLIT_NO_EMPTY);

        return array_values(array_unique($words === false ? [] : $words));
    }
}
