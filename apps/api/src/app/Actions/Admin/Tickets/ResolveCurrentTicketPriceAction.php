<?php

namespace App\Actions\Admin\Tickets;

use App\Models\TicketPrice;
use Carbon\CarbonInterface;

/**
 * Precio vigente de un tipo en un instante (api-009 RN-03): fila no eliminada con effective_at menor
 * o igual al instante, de mayor effective_at; el id desempata filas del mismo instante.
 */
class ResolveCurrentTicketPriceAction
{
    public function execute(string $ticketType, ?CarbonInterface $at = null): ?TicketPrice
    {
        return TicketPrice::query()
            ->where('ticket_type', $ticketType)
            ->where('effective_at', '<=', ($at ?? now())->copy()->utc())
            ->orderByDesc('effective_at')
            ->orderByDesc('id')
            ->first();
    }

    /** Próximo cambio programado de un tipo (posterior al instante), si existe. */
    public function next(string $ticketType, ?CarbonInterface $at = null): ?TicketPrice
    {
        return TicketPrice::query()
            ->where('ticket_type', $ticketType)
            ->where('effective_at', '>', ($at ?? now())->copy()->utc())
            ->orderBy('effective_at')
            ->orderBy('id')
            ->first();
    }
}
