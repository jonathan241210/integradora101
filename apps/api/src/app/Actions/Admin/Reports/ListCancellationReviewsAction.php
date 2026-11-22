<?php

namespace App\Actions\Admin\Reports;

use App\Models\CancellationReview;

/** Historial de revisiones de un cajero y día, de la más reciente a la más antigua (api-027 CA-20). Solo lectura. */
class ListCancellationReviewsAction
{
    /** @return list<array> */
    public function execute(int $cashierId, string $businessDate): array
    {
        return CancellationReview::query()->with('reviewer')
            ->where('cashier_id', $cashierId)
            ->where('business_date', $businessDate)
            ->orderByDesc('id')
            ->get()
            ->map(fn (CancellationReview $review): array => PresentCancellationReview::from($review))
            ->all();
    }
}
