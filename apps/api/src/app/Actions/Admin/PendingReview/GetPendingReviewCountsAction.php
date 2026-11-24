<?php

namespace App\Actions\Admin\PendingReview;

use App\Actions\Admin\Reports\CountPendingCancellationDaysAction;
use App\Enums\MemoryStatus;
use App\Enums\SpeciesRequestStatus;
use App\Models\SpeciesPublicationRequest;
use App\Models\User;
use App\Models\VisitorMemory;

/** api-024 (y api-027 para `cancellation_days`): conteos de pendientes de revisión, solo lectura y solo las claves que el permiso de quien llama permite. */
class GetPendingReviewCountsAction
{
    public function __construct(private CountPendingCancellationDaysAction $cancellationDays) {}

    /** @return array<string, int> */
    public function execute(User $user): array
    {
        $counts = [];

        if ($user->hasPermissionTo('species.review')) {
            // `whereHas('species')` respeta SoftDeletes de Species, igual que la cola de api-014 (CA-12).
            $counts['species_requests'] = SpeciesPublicationRequest::query()
                ->where('status', SpeciesRequestStatus::Submitted->value)
                ->whereHas('species')
                ->count();
        }

        if ($user->hasPermissionTo('memories.review')) {
            $counts['memories'] = VisitorMemory::query()
                ->whereIn('status', [MemoryStatus::Submitted->value, MemoryStatus::InReview->value])
                ->count();
        }

        // api-027 CA-23, CA-24: días en Atención sin revisar, solo con el permiso del reporte de cancelaciones.
        if ($user->hasPermissionTo('reports.cancellations.view')) {
            $counts['cancellation_days'] = $this->cancellationDays->execute();
        }

        return $counts;
    }
}
