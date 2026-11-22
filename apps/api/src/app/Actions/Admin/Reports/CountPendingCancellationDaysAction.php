<?php

namespace App\Actions\Admin\Reports;

use App\Enums\CancellationReviewLevel;
use App\Enums\CancellationReviewStatus;
use App\Support\BusinessTimezone;
use Carbon\CarbonImmutable;

/**
 * Pares cajero-día en Atención de los últimos días de negocio cerrados (excluido hoy) sin revisión vigente o con
 * «Requiere aclaración» (api-027 RN-11, CA-23). Usa la misma Action de semáforo que el reporte.
 */
class CountPendingCancellationDaysAction
{
    public function __construct(private BuildCancellationTrafficLightAction $trafficLight) {}

    public function execute(): int
    {
        $today = CarbonImmutable::parse(BusinessTimezone::today(), 'UTC');
        $days = max(1, (int) config('arca.cancellation_review.pending_days'));
        $pending = 0;

        foreach ($this->trafficLight->execute($today->subDays($days)->toDateString(), $today->subDay()->toDateString()) as $row) {
            if ($row['traffic_light'] !== CancellationReviewLevel::Attention->value) {
                continue;
            }
            if ($row['review'] === null || $row['review']['status'] === CancellationReviewStatus::ClarificationRequired->value) {
                $pending++;
            }
        }

        return $pending;
    }
}
