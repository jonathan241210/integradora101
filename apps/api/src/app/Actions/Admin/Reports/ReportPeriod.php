<?php

namespace App\Actions\Admin\Reports;

use Carbon\CarbonImmutable;

/**
 * Periodo de reporte en hora local (inicio y fin de día inclusivos) y sus límites en UTC.
 */
final class ReportPeriod
{
    public function __construct(
        public readonly string $type,
        public readonly CarbonImmutable $from,
        public readonly CarbonImmutable $to,
        public readonly string $label,
        public readonly ?string $previousDate,
        public readonly ?string $nextDate,
    ) {}

    /** Zona horaria en la que se calculó el periodo (RN-14). */
    public function timezone(): string
    {
        return $this->from->getTimezone()->getName();
    }

    public function startUtc(): CarbonImmutable
    {
        return $this->from->startOfDay()->utc();
    }

    /** Límite superior exclusivo. */
    public function endUtc(): CarbonImmutable
    {
        return $this->to->addDay()->startOfDay()->utc();
    }

    public function toArray(): array
    {
        return [
            'type' => $this->type,
            'from' => $this->from->toDateString(),
            'to' => $this->to->toDateString(),
            'label' => $this->label,
            'previous_date' => $this->previousDate,
            'next_date' => $this->nextDate,
            'timezone' => $this->timezone(),
        ];
    }
}
