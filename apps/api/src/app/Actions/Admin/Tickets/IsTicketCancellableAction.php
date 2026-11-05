<?php

namespace App\Actions\Admin\Tickets;

use App\Models\Ticket;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Regla única de cancelabilidad (api-009 RN-08, RN-16): la usan el historial y la cancelación.
 */
class IsTicketCancellableAction
{
    public function execute(User $user, Ticket $ticket, ?CarbonImmutable $now = null): bool
    {
        return $user->can('tickets.cancel')
            && (int) $ticket->cashier_id === (int) $user->id
            && $ticket->status === Ticket::STATUS_COMPLETED
            && $this->isSameDay($ticket, $now);
    }

    /**
     * El día de la venta y el de hoy coinciden en la zona del zoológico (RN-16, revisión 2026-11-02):
     * nunca depende de la zona que envía el cliente.
     */
    public function isSameDay(Ticket $ticket, ?CarbonImmutable $now = null): bool
    {
        $now ??= CarbonImmutable::now('UTC');
        $timezone = (string) config('arca.report_timezone');

        return $ticket->purchased_at->copy()->setTimezone($timezone)->toDateString()
            === $now->setTimezone($timezone)->toDateString();
    }
}
