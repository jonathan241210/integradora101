<?php

namespace App\Actions\Admin\Reports;

use App\Models\CancellationReview;

/** Forma JSON de una revisión de cancelaciones (api-027 CA-17, CA-28). */
class PresentCancellationReview
{
    /** @return array{id: int, status: string, status_label: string, note: string, reviewed_by_name: ?string, reviewed_at: ?string} */
    public static function from(CancellationReview $review): array
    {
        return [
            'id' => (int) $review->id,
            'status' => $review->status->value,
            'status_label' => $review->status->label(),
            'note' => (string) $review->note,
            'reviewed_by_name' => PresentCancelledTicketRow::personName($review->reviewer),
            'reviewed_at' => $review->created_at?->utc()->toIso8601ZuluString(),
        ];
    }
}
