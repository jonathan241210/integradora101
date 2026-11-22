<?php

namespace App\Actions\Admin\Reports;

use App\Enums\TicketCancellationReason;
use App\Models\Ticket;
use App\Models\User;
use DateTimeInterface;

/** Fila del reporte de cancelaciones (api-022 CA-06 a CA-09). */
class PresentCancelledTicketRow
{
    /** Minutos enteros redondeados hacia abajo entre venta y cancelación (CA-07). */
    public static function minutesToCancel(DateTimeInterface $purchasedAt, DateTimeInterface $cancelledAt): int
    {
        return intdiv(max(0, $cancelledAt->getTimestamp() - $purchasedAt->getTimestamp()), 60);
    }

    public static function personName(?User $user): ?string
    {
        if ($user === null) {
            return null;
        }

        return trim(implode(' ', array_filter([$user->first_name, $user->last_name, $user->second_last_name])));
    }

    /** @param  list<string>  $signalCodes  señales del semáforo de su cajero y día en las que participa este boleto */
    public static function from(Ticket $ticket, array $signalCodes = []): array
    {
        $minutes = $ticket->purchased_at !== null && $ticket->cancelled_at !== null
            ? self::minutesToCancel($ticket->purchased_at, $ticket->cancelled_at)
            : null;
        $limit = (int) config('arca.cancellation_alerts.cancel_after_minutes');
        $seconds = $minutes === null ? 0 : $ticket->cancelled_at->getTimestamp() - $ticket->purchased_at->getTimestamp();
        // «Más de 30 minutos» = más de 1800 segundos (RN-08).
        $late = $seconds > $limit * 60;

        return [
            'folio' => (string) $ticket->id,
            'adult_quantity' => (int) $ticket->adult_quantity,
            'child_quantity' => (int) $ticket->child_quantity,
            'total_amount' => SummarizeTicketSalesAction::money(SummarizeTicketSalesAction::toCents($ticket->total_amount)),
            'purchased_at' => $ticket->purchased_at?->utc()->toIso8601ZuluString(),
            'cancelled_at' => $ticket->cancelled_at?->utc()->toIso8601ZuluString(),
            'cashier_name' => self::personName($ticket->cashier),
            'cancelled_by_name' => self::personName($ticket->canceller),
            'reason_code' => $ticket->cancellation_reason_code?->value,
            'reason_label' => TicketCancellationReason::labelFor($ticket->cancellation_reason_code),
            'comment' => $ticket->cancellation_reason,
            'minutes_to_cancel' => $minutes,
            'late_cancellation' => $late,
            'signal_codes' => $signalCodes,
        ];
    }
}
