<?php

namespace App\Actions\Admin\Tickets;

use App\Models\Ticket;

/** Resultado de una venta: boleto guardado y SVG del QR (solo en memoria). */
final class IssuedTicketSale
{
    public function __construct(public readonly Ticket $ticket, public readonly string $qrSvg) {}
}
