<?php

namespace App\Actions\Admin\Reports;

use App\Enums\TicketCancellationReason;
use App\Models\Ticket;
use App\Support\BusinessTimezone;
use App\Support\PageGuard;

/**
 * Única Action que calcula filas, totales, desgloses, conciliación y semáforo del reporte de cancelaciones
 * (api-022 RN-07). Periodo y filtros por día de venta en la zona de negocio (RN-06, RN-09, RN-15).
 */
class BuildCancellationReportAction
{
    public function __construct(
        private ResolveReportPeriodAction $resolvePeriod,
        private BuildCancellationTrafficLightAction $trafficLight,
    ) {}

    /**
     * @param  array{period?: string, date?: ?string, from?: ?string, to?: ?string, cashier_id?: int|string|null, reason_code?: ?string}  $input
     * @param  ?int  $page  Con valor, `rows` trae solo esa página y se añade `meta` (api-022 revisión 2026-11-21);
     *                      con `null` (exportación) trae todas las filas. Totales y conciliación siempre son del periodo completo.
     * @return array{period: ReportPeriod, totals: array, reconciliation: array, rows: list<array>, legend: list<array>, levels: list<array>, disclaimer: string, meta?: array}
     */
    public function execute(array $input, ?int $page = null): array
    {
        $period = $this->resolvePeriod->execute($input);

        $query = Ticket::query()
            ->with(['cashier', 'canceller'])
            ->whereIn('status', [Ticket::STATUS_COMPLETED, Ticket::STATUS_CANCELLED])
            ->where('purchased_at', '>=', $period->startUtc())
            ->where('purchased_at', '<', $period->endUtc())
            ->orderBy('purchased_at')
            ->orderBy('id');

        if (! empty($input['cashier_id'])) {
            $query->where('cashier_id', (int) $input['cashier_id']);
        }
        if (! empty($input['reason_code'])) {
            $query->where('cancellation_reason_code', $input['reason_code']);
        }

        $days = [];
        $cashiers = [];
        $reasons = [];
        $cancelledTickets = [];
        $totalQty = 0;
        $totalCents = 0;

        foreach ($query->get() as $ticket) {
            $qty = (int) $ticket->adult_quantity + (int) $ticket->child_quantity;
            $cents = SummarizeTicketSalesAction::toCents($ticket->total_amount);
            $cancelled = $ticket->status === Ticket::STATUS_CANCELLED;
            $date = BusinessTimezone::dateOf($ticket->purchased_at);

            $days[$date] ??= $this->bucket();
            $this->add($days[$date], $qty, $cents, $cancelled);

            $cashierId = (int) $ticket->cashier_id;
            $cashiers[$cashierId] ??= $this->bucket() + [
                'name' => PresentCancelledTicketRow::personName($ticket->cashier) ?? 'Sin cajero registrado',
                'days' => [],
            ];
            $this->add($cashiers[$cashierId], $qty, $cents, $cancelled);
            $cashiers[$cashierId]['days'][$date] = true;

            if ($cancelled) {
                $key = $ticket->cancellation_reason_code?->value ?? '';
                $reasons[$key] ??= ['cancelled_qty' => 0, 'cancelled_cents' => 0];
                $reasons[$key]['cancelled_qty'] += $qty;
                $reasons[$key]['cancelled_cents'] += $cents;
                $totalQty += $qty;
                $totalCents += $cents;
                $cancelledTickets[] = $ticket;
            }
        }

        ksort($days);

        // El orden de la consulta (purchased_at, id) es estable entre páginas.
        $meta = null;
        if ($page === null) {
            $pageTickets = $cancelledTickets;
        } else {
            $perPage = (int) config('arca.report_page_size');
            $total = count($cancelledTickets);
            // `page` absurdo: lista vacía sin desbordar el desplazamiento (CA-29).
            $pageTickets = PageGuard::exceeds($page) ? [] : array_slice($cancelledTickets, ($page - 1) * $perPage, $perPage);
            $meta = [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ];
        }

        // api-027: semáforo completo (nivel con todos los datos); de él salen `signal_codes`, `days_to_review` y
        // `cashier_days`, que solo se recorta por `cashier_id` al presentarlo (rev. 2026-11-21 c, RN-06).
        $light = $this->trafficLight->execute($period->from->toDateString(), $period->to->toDateString());
        $signalsByFolio = [];
        $reviewDays = [];
        foreach ($light as $day) {
            foreach ($day['reasons'] as $reason) {
                foreach ($reason['folios'] as $folio) {
                    $signalsByFolio[$folio][] = $reason['code'];
                }
            }
            if (in_array($day['traffic_light'], ['attention', 'review'], true)) {
                $reviewDays[(int) $day['cashier_id']][$day['traffic_light']] = ($reviewDays[(int) $day['cashier_id']][$day['traffic_light']] ?? 0) + 1;
            }
        }
        $cashierFilter = ! empty($input['cashier_id']) ? (int) $input['cashier_id'] : null;
        $cashierDays = $cashierFilter === null
            ? $light
            : array_values(array_filter($light, fn (array $day): bool => $day['cashier_id'] === $cashierFilter));

        $rows = array_map(fn (Ticket $ticket) => PresentCancelledTicketRow::from($ticket, $signalsByFolio[(string) $ticket->id] ?? []), $pageTickets);

        return [
            'period' => $period,
            'totals' => [
                'cancelled_tickets' => $totalQty,
                'cancelled_amount' => SummarizeTicketSalesAction::money($totalCents),
                'by_cashier' => $this->byCashier($cashiers),
                'by_reason' => $this->byReason($reasons),
            ],
            'reconciliation' => [
                'days' => array_map(
                    fn (string $date, array $day): array => ['date' => $date] + $this->money($day),
                    array_keys($days),
                    $days,
                ),
                'cashiers' => $this->cashierReconciliation($cashiers, $reviewDays),
                // api-027: semáforo por cajero y día; sin paginación ni filtro de motivo; `cashier_id` solo recorta la
                // lista, nunca cambia el nivel (RN-06, CA-12, CA-27; rev. 2026-11-21 c).
                'cashier_days' => $cashierDays,
            ],
            'rows' => $rows,
        ] + $this->trafficLight->legend() + ($meta !== null ? ['meta' => $meta] : []);
    }

    private function bucket(): array
    {
        return ['gross_qty' => 0, 'cancelled_qty' => 0, 'gross_cents' => 0, 'cancelled_cents' => 0, 'completed_cents' => 0];
    }

    private function add(array &$bucket, int $qty, int $cents, bool $cancelled): void
    {
        $bucket['gross_qty'] += $qty;
        $bucket['gross_cents'] += $cents;
        if ($cancelled) {
            $bucket['cancelled_qty'] += $qty;
            $bucket['cancelled_cents'] += $cents;
        } else {
            $bucket['completed_cents'] += $cents;
        }
    }

    /** Bruto, cancelado y neto (suma de completados) con la comprobación bruto = neto + cancelado (RN-06). */
    private function money(array $bucket): array
    {
        return [
            'gross' => SummarizeTicketSalesAction::money($bucket['gross_cents']),
            'cancelled' => SummarizeTicketSalesAction::money($bucket['cancelled_cents']),
            'net' => SummarizeTicketSalesAction::money($bucket['completed_cents']),
            'balanced' => $bucket['gross_cents'] === $bucket['completed_cents'] + $bucket['cancelled_cents'],
        ];
    }

    private function byCashier(array $cashiers): array
    {
        $out = [];
        foreach ($cashiers as $id => $cashier) {
            if ($cashier['cancelled_qty'] === 0) {
                continue;
            }
            $out[] = [
                'cashier_id' => $id ?: null,
                'cashier_name' => $cashier['name'],
                'cancelled_tickets' => $cashier['cancelled_qty'],
                'cancelled_amount' => SummarizeTicketSalesAction::money($cashier['cancelled_cents']),
            ];
        }
        usort($out, fn (array $a, array $b) => strcmp($a['cashier_name'], $b['cashier_name']) ?: $a['cashier_id'] <=> $b['cashier_id']);

        return $out;
    }

    /** En el orden del catálogo; «Sin clasificar (anterior)» al final. */
    private function byReason(array $reasons): array
    {
        $out = [];
        foreach ([...TicketCancellationReason::cases(), null] as $reason) {
            $bucket = $reasons[$reason?->value ?? ''] ?? null;
            if ($bucket === null) {
                continue;
            }
            $out[] = [
                'reason_code' => $reason?->value,
                'reason_label' => TicketCancellationReason::labelFor($reason),
                'cancelled_tickets' => $bucket['cancelled_qty'],
                'cancelled_amount' => SummarizeTicketSalesAction::money($bucket['cancelled_cents']),
            ];
        }

        return $out;
    }

    /** @param  array<int, array<string, int>>  $reviewDays  días con nivel Atención/Revisar por cajero (semáforo) */
    private function cashierReconciliation(array $cashiers, array $reviewDays): array
    {
        $out = [];
        foreach ($cashiers as $id => $cashier) {
            $sold = $cashier['gross_qty'];
            $percent = $sold > 0 ? round($cashier['cancelled_qty'] / $sold * 100, 2) : 0.0;
            $dates = array_keys($cashier['days']);
            sort($dates);

            $out[] = ['cashier_id' => $id ?: null, 'cashier_name' => $cashier['name']] + $this->money($cashier) + [
                'active_days' => $dates,
                'sold_tickets' => $sold,
                'cancel_percent' => $percent,
                'days_to_review' => [
                    'attention' => $reviewDays[$id]['attention'] ?? 0,
                    'review' => $reviewDays[$id]['review'] ?? 0,
                ],
            ];
        }
        usort($out, fn (array $a, array $b) => strcmp($a['cashier_name'], $b['cashier_name']) ?: $a['cashier_id'] <=> $b['cashier_id']);

        return $out;
    }
}
