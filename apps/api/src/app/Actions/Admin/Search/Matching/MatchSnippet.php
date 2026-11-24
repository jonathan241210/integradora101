<?php

namespace App\Actions\Admin\Search\Matching;

/** CA-42: fragmento de como máximo 120 caracteres centrado en la coincidencia, con «…» dentro del límite. */
final class MatchSnippet
{
    public const MAX = 120;

    /**
     * @param  string  $text  Texto del campo con espacios colapsados.
     * @param  int  $offset  Posición (en caracteres) de la coincidencia.
     */
    public static function make(string $text, int $offset, int $length): string
    {
        $total = mb_strlen($text, 'UTF-8');

        if ($total <= self::MAX) {
            return $text;
        }

        // Con recorte por ambos lados caben 118 caracteres más los dos «…».
        $window = self::MAX - 2;
        $start = max(0, $offset + intdiv($length, 2) - intdiv($window, 2));
        $end = min($total, $start + $window);
        $start = max(0, $end - $window);

        return ($start > 0 ? '…' : '')
            .mb_substr($text, $start, $end - $start, 'UTF-8')
            .($end < $total ? '…' : '');
    }
}
