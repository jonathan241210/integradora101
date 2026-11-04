<?php

namespace App\Actions\Admin\Tickets;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Ticket;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CancelTicketAction
{
    public function __construct(
        private IsTicketCancellableAction $cancellable,
        private LogAdminActivityAction $log,
    ) {}

    /**
     * El boleto ya viene acotado al cajero que lo vendió (CancelTicketRequest). Orden de RN-16:
     * ya cancelado (CA-12) y después mismo día (CA-31), siempre en la zona del zoológico.
     */
    public function execute(User $cashier, Ticket $ticket, string $reason): Ticket
    {
        return DB::transaction(function () use ($cashier, $ticket, $reason) {
            $locked = Ticket::query()->whereKey($ticket->getKey())->lockForUpdate()->first();

            // Borrado entre la autorización y el bloqueo: mismo 404 que un boleto ajeno (CA-13).
            if ($locked === null) {
                throw new NotFoundHttpException('Boleto no encontrado.');
            }

            if ($locked->status === Ticket::STATUS_CANCELLED) {
                throw ValidationException::withMessages(['ticket' => ['Este boleto ya está cancelado.']]);
            }

            $now = CarbonImmutable::now('UTC')->startOfSecond();

            if (! $this->cancellable->isSameDay($locked, $now)) {
                throw ValidationException::withMessages([
                    'ticket' => ['Solo se pueden cancelar boletos el mismo día en que se vendieron.'],
                ]);
            }

            $locked->forceFill([
                'status' => Ticket::STATUS_CANCELLED,
                'cancelled_at' => $now,
                'cancelled_by' => $cashier->id,
                'cancellation_reason' => $reason,
                'updated_by' => $cashier->id,
            ])->save();

            $this->log->execute('ticket-cancelled', 'Boleto cancelado', $locked, [
                'folio' => $locked->id,
                'total_amount' => $locked->total_amount,
                'reason' => $reason,
            ]);

            $locked->load('cashier');
            $locked->setAttribute('cancellable', $this->cancellable->execute($cashier, $locked, $now));

            return $locked;
        });
    }
}
