<?php

namespace App\Actions\Admin\Tickets;

use Carbon\CarbonImmutable;

/** Resultado de una venta: los boletos individuales (adultos primero) y los datos de la compra (api-009 CA-50). */
final class IssuedTicketPurchase
{
    /** @param list<IssuedTicketSale> $tickets */
    public function __construct(
        public readonly array $tickets,
        public readonly int $adultQuantity,
        public readonly int $childQuantity,
        public readonly string $totalAmount,
        public readonly CarbonImmutable $purchasedAt,
    ) {}
}
