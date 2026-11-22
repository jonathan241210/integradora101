<?php

namespace App\Actions\Admin\Reports;

use App\Support\BusinessTimezone;
use Carbon\CarbonImmutable;

class BuildDashboardSummaryAction
{
    public function __construct(private SummarizeTicketSalesAction $summarize) {}

    public function execute(): array
    {
        $timezone = BusinessTimezone::name();
        $today = CarbonImmutable::now($timezone)->startOfDay();
        $period = new ReportPeriod('custom', $today->subDays(6)->startOfDay(), $today, 'Últimos 7 días', null, null);

        $summary = $this->summarize->execute($period);
        $todayRow = collect($summary['daily'])->firstWhere('date', $today->toDateString());
        unset($todayRow['date']);

        return [
            'timezone' => $timezone,
            'today' => $todayRow,
            'last_7_days' => $summary['totals'],
            'series' => array_map(
                fn (array $row) => ['date' => $row['date'], 'revenue' => $row['revenue']],
                $summary['daily'],
            ),
        ];
    }
}
