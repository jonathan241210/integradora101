<?php

namespace App\Actions\Admin\Tickets;

/**
 * Total de la venta en céntimos enteros, sin floats (api-009 CA-02, RN-02).
 */
class CalculateTicketTotalAction
{
    public function execute(int $adultQuantity, string|int|float $adultPrice, int $childQuantity, string|int|float $childPrice): string
    {
        $cents = $adultQuantity * self::toCents($adultPrice) + $childQuantity * self::toCents($childPrice);

        return self::format($cents);
    }

    public static function toCents(string|int|float $amount): int
    {
        [$whole, $fraction] = array_pad(explode('.', number_format((float) $amount, 2, '.', '')), 2, '00');

        return ((int) $whole) * 100 + (int) $fraction;
    }

    public static function format(int $cents): string
    {
        return intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }
}
