<?php

namespace App\Actions\Admin\Tickets;

use App\Models\Ticket;

/** Un boleto individual emitido: fila guardada, tipo y SVG del QR (solo en memoria). */
final class IssuedTicketSale
{
    public function __construct(public readonly Ticket $ticket, public readonly string $qrSvg, public readonly string $type) {}
}
