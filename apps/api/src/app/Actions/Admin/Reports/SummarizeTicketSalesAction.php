<?php

namespace App\Actions\Admin\Reports;

use App\Models\Ticket;
use Carbon\CarbonImmutable;

class SummarizeTicketSalesAction
{
    /**
     * Totales y desglose diario del periodo. Los importes se acumulan en centavos y salen como cadena.
     *
     * @return array{totals: array, daily: list<array>}
     */
    public function execute(ReportPeriod $period): array
    {
        $timezone = $period->timezone();
        $days = [];
        // Se itera por fecha de calendario: en zonas con cambio de hora a medianoche (p. ej. America/Santiago)
        // la medianoche local puede no existir y comparar instantes perdería el día.
        $last = $period->to->toDateString();
        for ($day = CarbonImmutable::parse($period->from->toDateString(), 'UTC'); $day->toDateString() <= $last; $day = $day->addDay()) {
            $days[$day->toDateString()] = ['tickets' => 0, 'adults' => 0, 'children' => 0, 'cents' => 0];
        }

        $query = Ticket::query()
            ->select(['id', 'adult_quantity', 'child_quantity', 'total_amount', 'purchased_at'])
            ->where('purchased_at', '>=', $period->startUtc())
            ->where('purchased_at', '<', $period->endUtc());

        foreach ($query->cursor() as $ticket) {
            $date = $ticket->purchased_at->setTimezone($timezone)->toDateString();
            if (! isset($days[$date])) {
                continue;
            }
            $days[$date]['tickets']++;
            $days[$date]['adults'] += (int) $ticket->adult_quantity;
            $days[$date]['children'] += (int) $ticket->child_quantity;
            $days[$date]['cents'] += self::toCents($ticket->total_amount);
        }

        $totals = ['tickets' => 0, 'adults' => 0, 'children' => 0, 'cents' => 0];
        $daily = [];
        foreach ($days as $date => $row) {
            foreach ($totals as $key => $value) {
                $totals[$key] = $value + $row[$key];
            }
            $daily[] = self::present(['date' => $date] + $row);
        }

        return ['totals' => self::present($totals), 'daily' => $daily];
    }

    public static function toCents(mixed $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }

    public static function money(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }

    private static function present(array $row): array
    {
        $out = isset($row['date']) ? ['date' => $row['date']] : [];

        return $out + [
            'tickets' => $row['tickets'],
            'adults' => $row['adults'],
            'children' => $row['children'],
            'revenue' => self::money($row['cents']),
        ];
    }
}
