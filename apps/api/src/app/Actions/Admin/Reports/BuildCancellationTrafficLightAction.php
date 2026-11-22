<?php

namespace App\Actions\Admin\Reports;

use App\Enums\CancellationReviewLevel;
use App\Enums\CancellationSignal;
use App\Enums\TicketCancellationReason;
use App\Models\CancellationReview;
use App\Models\Ticket;
use App\Models\User;
use App\Support\BusinessTimezone;
use Carbon\CarbonImmutable;

/**
 * Semáforo por cajero y día de negocio (api-027 RN-01, RN-04 a RN-06, RN-15). Es la única Action que calcula
 * señales y niveles: la usan el reporte, la exportación y el conteo de pendientes. Siempre usa todos los
 * cajeros y todos los motivos (sin filtros, RN-06) y recalcula en cada consulta.
 */
class BuildCancellationTrafficLightAction
{
    public function __construct(private PresentCancellationReasonsAction $present) {}

    /**
     * @param  string  $from  primer día de negocio (Y-m-d) a presentar
     * @param  string  $to  último día de negocio (Y-m-d) a presentar
     *                      Siempre con todos los cajeros: el reporte recorta por `cashier_id` después (api-027 rev. 2026-11-21 c).
     * @return list<array<string, mixed>>
     */
    public function execute(string $from, string $to): array
    {
        $cfg = config('arca.cancellation_review');
        $lookbackDays = max((int) $cfg['baseline_weeks'] * 7, (int) $cfg['peer_window_days'] - 1);
        $data = $this->load(self::shift($from, -$lookbackDays), $to);
        $names = $this->names(array_keys($data));
        $reviews = $this->currentReviews($from, $to);

        $out = [];
        foreach ($data as $cashierId => $days) {
            foreach ($days as $date => $day) {
                if ($date < $from || $date > $to || $day['gross'] <= 0) {
                    continue;
                }

                if ($cashierId === 0) {
                    $out[] = $this->row(null, 'Sin cajero registrado', $date, $day, null, [], null);

                    continue;
                }

                $signals = $this->signals($cashierId, $date, $data, $cfg);
                $level = CancellationReviewLevel::fromSignalCount(count($signals), (int) $cfg['attention_min_signals']);
                $out[] = $this->row($cashierId, $names[$cashierId] ?? 'Cajero eliminado', $date, $day, $level, $signals, $reviews[$cashierId][$date] ?? null);
            }
        }

        usort($out, fn (array $a, array $b): int => strcmp($a['date'], $b['date'])
            ?: strcmp($a['cashier_name'], $b['cashier_name'])
            ?: (($a['cashier_id'] ?? PHP_INT_MAX) <=> ($b['cashier_id'] ?? PHP_INT_MAX)));

        return $out;
    }

    /** @return array{legend: list<array>, levels: list<array>, disclaimer: string} */
    public function legend(): array
    {
        return $this->present->legend();
    }

    /** Desplaza un día `Y-m-d` por calendario, sin zona (solo aritmética de fechas). */
    private static function shift(string $date, int $days): string
    {
        return CarbonImmutable::parse($date, 'UTC')->addDays($days)->toDateString();
    }

    /**
     * Agregados por cajero (0 = sin cajero) y día: cantidades brutas y canceladas, última venta y cancelaciones.
     *
     * @return array<int, array<string, array{gross: int, cancelled: int, last: int, cancels: list<array>}>>
     */
    private function load(string $fromDate, string $toDate): array
    {
        $data = [];
        $tickets = Ticket::query()
            ->select(['id', 'cashier_id', 'status', 'adult_quantity', 'child_quantity', 'total_amount', 'purchased_at', 'cancelled_at', 'cancellation_reason_code'])
            ->whereIn('status', [Ticket::STATUS_COMPLETED, Ticket::STATUS_CANCELLED])
            ->where('purchased_at', '>=', BusinessTimezone::startOfDayUtc($fromDate))
            ->where('purchased_at', '<', BusinessTimezone::endOfDayUtc($toDate))
            ->cursor();

        foreach ($tickets as $ticket) {
            $cashierId = (int) $ticket->cashier_id;
            $date = BusinessTimezone::dateOf($ticket->purchased_at);
            $qty = (int) $ticket->adult_quantity + (int) $ticket->child_quantity;
            $day = &$data[$cashierId][$date];
            $day ??= ['gross' => 0, 'cancelled' => 0, 'last' => 0, 'cancels' => []];
            $day['gross'] += $qty;
            $day['last'] = max($day['last'], $ticket->purchased_at->getTimestamp());

            if ($ticket->status === Ticket::STATUS_CANCELLED) {
                $day['cancelled'] += $qty;
                $day['cancels'][] = [
                    'folio' => (string) $ticket->id,
                    'cents' => SummarizeTicketSalesAction::toCents($ticket->total_amount),
                    'other' => $ticket->cancellation_reason_code === TicketCancellationReason::Other,
                    'seconds' => $ticket->cancelled_at !== null ? $ticket->cancelled_at->getTimestamp() - $ticket->purchased_at->getTimestamp() : 0,
                    'cancelled_ts' => $ticket->cancelled_at?->getTimestamp(),
                ];
            }
            unset($day);
        }

        return $data;
    }

    /** @param  list<int>  $ids */
    private function names(array $ids): array
    {
        $ids = array_values(array_filter($ids));
        if ($ids === []) {
            return [];
        }

        $names = [];
        foreach (User::withTrashed()->whereIn('id', $ids)->get() as $user) {
            $names[(int) $user->id] = PresentCancelledTicketRow::personName($user) ?? '';
        }

        return $names;
    }

    /** Revisión vigente (la de mayor `id`) por cajero y día (RN-07). @return array<int, array<string, array>> */
    private function currentReviews(string $from, string $to): array
    {
        $out = [];
        $reviews = CancellationReview::query()->with('reviewer')
            ->whereBetween('business_date', [$from, $to])
            ->orderBy('id')
            ->get();

        foreach ($reviews as $review) {
            $out[(int) $review->cashier_id][$review->business_date->toDateString()] = PresentCancellationReview::from($review);
        }

        return $out;
    }

    /** @return array<string, array<string, mixed>> hechos por código de señal disparada */
    private function signals(int $cashierId, string $date, array $data, array $cfg): array
    {
        $day = $data[$cashierId][$date];
        $gross = $day['gross'];
        $cancelled = $day['cancelled'];
        $cancels = $day['cancels'];
        $percent = $gross > 0 ? $cancelled / $gross * 100 : 0.0;
        $signals = [];
        // Señales de porcentaje o comparación (S1, C1, C2): todos los cancelados del cajero y día (api-027 rev. 2026-11-21 c).
        $allFolios = self::folios($cancels);

        // S1: más del límite y con el mínimo de boletos vendidos. Se compara sin redondear.
        if ($gross >= (int) $cfg['daily_min_sold_tickets'] && $cancelled * 100 > (float) $cfg['over_limit_percent'] * $gross) {
            $signals[CancellationSignal::OverLimitPercent->value] = ['count' => $cancelled, 'gross' => $gross, 'percent' => $percent, 'folios' => $allFolios];
        }

        // S2: cancelaciones dentro de [L − ventana, L], con L la última venta del cajero ese día.
        $windowSeconds = (int) $cfg['late_window_minutes'] * 60;
        $lateCancels = array_filter($cancels, fn (array $c): bool => $c['cancelled_ts'] !== null
            && $c['cancelled_ts'] >= $day['last'] - $windowSeconds && $c['cancelled_ts'] <= $day['last']);
        $late = count($lateCancels);
        if ($late >= (int) $cfg['late_min_count']) {
            $signals[CancellationSignal::LateCancellations->value] = ['count' => $late, 'minutes' => (int) $cfg['late_window_minutes'], 'folios' => self::folios($lateCancels)];
        }

        // Señal 3 (repeated_other): motivo «Otro» repetido.
        $otherCancels = array_filter($cancels, fn (array $c): bool => $c['other']);
        $other = count($otherCancels);
        if ($other >= (int) $cfg['repeated_other_min']) {
            $signals[CancellationSignal::RepeatedOther->value] = ['count' => $other, 'folios' => self::folios($otherCancels)];
        }

        // S4: mismo importe (en centavos).
        $sameAmount = 0;
        $sameCancels = [];
        $counts = array_count_values(array_column($cancels, 'cents'));
        foreach ($counts as $times) {
            if ($times >= (int) $cfg['same_amount_min']) {
                $sameAmount += $times;
            }
        }
        if ($sameAmount > 0) {
            $sameCancels = array_filter($cancels, fn (array $c): bool => $counts[$c['cents']] >= (int) $cfg['same_amount_min']);
            $signals[CancellationSignal::SameAmount->value] = ['count' => $sameAmount, 'folios' => self::folios($sameCancels)];
        }

        // S5: más de N minutos entre venta y cancelación (más de 1800 s, api-022 RN-08).
        $longCancels = array_filter($cancels, fn (array $c): bool => $c['seconds'] > (int) $cfg['long_cancel_minutes'] * 60);
        $long = count($longCancels);
        if ($long >= (int) $cfg['long_cancel_min_count']) {
            $signals[CancellationSignal::LongCancellations->value] = ['count' => $long, 'minutes' => (int) $cfg['long_cancel_minutes'], 'folios' => self::folios($longCancels)];
        }

        $floors = $cancelled >= (int) $cfg['comparison_min_cancelled']
            && $cancelled * 100 >= (float) $cfg['comparison_min_percent'] * $gross;

        if ($floors) {
            $own = $this->ownBaseline($data[$cashierId], $date, $cfg);
            // p_d ≥ m × B con enteros: cancelled × Σgross ≥ m × Σcancelled × gross.
            if ($own !== null && $cancelled * $own['gross'] >= (float) $cfg['baseline_multiplier'] * $own['cancelled'] * $gross) {
                $signals[CancellationSignal::OwnBaseline->value] = [
                    'count' => $cancelled, 'percent' => $percent,
                    'reference' => $own['cancelled'] / $own['gross'] * 100, 'weeks' => (int) $cfg['baseline_weeks'], 'folios' => $allFolios,
                ];
            }

            $median = $this->peerMedian($data, $cashierId, $date, $cfg);
            if ($median !== null && $percent / 100 + 1e-9 >= (float) $cfg['baseline_multiplier'] * $median) {
                $signals[CancellationSignal::PeerComparison->value] = [
                    'count' => $cancelled, 'percent' => $percent,
                    'reference' => $median * 100, 'days' => (int) $cfg['peer_window_days'], 'folios' => $allFolios,
                ];
            }
        }

        // Orden fijo S1..S5, C1, C2 (el de la enumeración).
        $ordered = [];
        foreach (CancellationSignal::cases() as $signal) {
            if (isset($signals[$signal->value])) {
                $ordered[$signal->value] = $signals[$signal->value];
            }
        }

        return $ordered;
    }

    /** Folios (id del boleto como texto, igual que `rows[].folio`) en orden numérico. @return list<string> */
    private static function folios(array $cancels): array
    {
        $folios = array_map(fn (array $c): string => $c['folio'], array_values($cancels));
        usort($folios, fn (string $a, string $b): int => (int) $a <=> (int) $b);

        return $folios;
    }

    /** Histórico propio: las N semanas anteriores a `d` (sin `d`); null si hay menos días con actividad que el mínimo. */
    private function ownBaseline(array $days, string $date, array $cfg): ?array
    {
        $sum = $this->windowSum($days, self::shift($date, -(int) $cfg['baseline_weeks'] * 7), self::shift($date, -1));

        if ($sum['active'] < (int) $cfg['baseline_min_active_days'] || $sum['gross'] <= 0) {
            return null;
        }

        return $sum;
    }

    /** Mediana de `p` de los demás cajeros en la ventana que termina en `d`; null con menos compañeros que el mínimo. */
    private function peerMedian(array $data, int $cashierId, string $date, array $cfg): ?float
    {
        $from = self::shift($date, -((int) $cfg['peer_window_days'] - 1));
        $ratios = [];
        foreach ($data as $otherId => $days) {
            if ($otherId === 0 || $otherId === $cashierId) {
                continue;
            }
            $sum = $this->windowSum($days, $from, $date);
            if ($sum['gross'] >= (int) $cfg['peer_min_sold_tickets']) {
                $ratios[] = $sum['cancelled'] / $sum['gross'];
            }
        }

        if (count($ratios) < max(1, (int) $cfg['peer_min_cashiers'])) {
            return null;
        }

        sort($ratios);
        $mid = intdiv(count($ratios), 2);

        return count($ratios) % 2 === 1 ? $ratios[$mid] : ($ratios[$mid - 1] + $ratios[$mid]) / 2;
    }

    /** @return array{gross: int, cancelled: int, active: int} */
    private function windowSum(array $days, string $from, string $to): array
    {
        $sum = ['gross' => 0, 'cancelled' => 0, 'active' => 0];
        foreach ($days as $date => $day) {
            if ($date >= $from && $date <= $to && $day['gross'] > 0) {
                $sum['gross'] += $day['gross'];
                $sum['cancelled'] += $day['cancelled'];
                $sum['active']++;
            }
        }

        return $sum;
    }

    private function row(?int $cashierId, string $name, string $date, array $day, ?CancellationReviewLevel $level, array $signals, ?array $review): array
    {
        $text = $level === null
            ? ['reasons' => [], 'reason_sentence' => null, 'action' => PresentCancellationReasonsAction::NO_CASHIER_ACTION]
            : $this->present->execute($level, $signals);

        return [
            'cashier_id' => $cashierId,
            'cashier_name' => $name,
            'date' => $date,
            'traffic_light' => $level?->value,
            'traffic_light_label' => $level?->label(),
            'signals_count' => count($signals),
            'sold_tickets' => $day['gross'],
            'cancelled_tickets' => $day['cancelled'],
            'cancel_percent' => round($day['cancelled'] / $day['gross'] * 100, 2),
        ] + $text + ['review' => $review];
    }
}
