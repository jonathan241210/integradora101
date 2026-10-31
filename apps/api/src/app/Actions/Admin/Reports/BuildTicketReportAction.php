<?php

namespace App\Actions\Admin\Reports;

use App\Models\Ticket;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class BuildTicketReportAction
{
    public function __construct(
        private ResolveReportPeriodAction $resolvePeriod,
        private SummarizeTicketSalesAction $summarize,
    ) {}

    /**
     * @return array{period: ReportPeriod, totals: array, daily: list<array>, tickets: LengthAwarePaginator}
     */
    public function execute(array $input): array
    {
        $period = $this->resolvePeriod->execute($input);
        $summary = $this->summarize->execute($period);

        $tickets = Ticket::query()
            ->select(['id', 'adult_quantity', 'child_quantity', 'total_amount', 'purchased_at'])
            ->where('purchased_at', '>=', $period->startUtc())
            ->where('purchased_at', '<', $period->endUtc())
            ->orderBy('purchased_at')
            ->orderBy('id')
            ->paginate((int) config('arca.report_page_size'));

        return ['period' => $period] + $summary + ['tickets' => $tickets];
    }
}
