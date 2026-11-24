<?php

namespace App\Actions\Admin\Reports;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\CancellationReview;
use App\Models\Ticket;
use App\Models\User;
use App\Support\BusinessTimezone;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Registra una revisión de cancelaciones por cajero y día (api-027 CA-17 a CA-21, RN-07, RN-08). Cada decisión es
 * una fila nueva (también si repite el estado, CA-19); la fila y su auditoría van en una sola transacción.
 */
class RecordCancellationReviewAction
{
    public function __construct(private LogAdminActivityAction $log) {}

    /** @param  array{cashier_id: int|string, business_date: string, status: string, note: string}  $data */
    public function execute(User $actor, array $data): CancellationReview
    {
        $cashierId = (int) $data['cashier_id'];
        $date = (string) $data['business_date'];

        if ($date > BusinessTimezone::today()) {
            throw ValidationException::withMessages(['business_date' => ['No se puede revisar un día que aún no ha ocurrido.']]);
        }

        $hasActivity = Ticket::query()
            ->where('cashier_id', $cashierId)
            ->whereIn('status', [Ticket::STATUS_COMPLETED, Ticket::STATUS_CANCELLED])
            ->where('purchased_at', '>=', BusinessTimezone::startOfDayUtc($date))
            ->where('purchased_at', '<', BusinessTimezone::endOfDayUtc($date))
            ->exists();

        if (! $hasActivity) {
            throw ValidationException::withMessages(['business_date' => ['El cajero no tiene actividad ese día.']]);
        }

        return DB::transaction(function () use ($actor, $cashierId, $date, $data): CancellationReview {
            $review = CancellationReview::query()->create([
                'cashier_id' => $cashierId,
                'business_date' => $date,
                'status' => $data['status'],
                'note' => $data['note'],
                'reviewed_by' => $actor->id,
            ]);

            $this->log->execute('cashier-day-reviewed', 'Revisión de cancelaciones por cajero y día registrada', $review, [
                'cashier_id' => $cashierId,
                'business_date' => $date,
                'status' => $data['status'],
                'note' => $data['note'],
                'review_id' => $review->id,
            ]);

            return $review->load('reviewer');
        });
    }
}
