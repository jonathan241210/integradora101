<?php

namespace App\Actions\Admin\Tickets;

use App\Models\TicketPrice;

/** Cotización de una venta calculada por la API (api-009 RN-02, RN-34). Importes como cadenas con dos decimales. */
final class TicketQuote
{
    public function __construct(
        public readonly TicketPrice $adultPrice,
        public readonly TicketPrice $childPrice,
        public readonly string $adultSubtotal,
        public readonly string $childSubtotal,
        public readonly string $totalAmount,
    ) {}
}
