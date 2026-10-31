<?php

namespace App\Actions\Admin\Reports;

use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class ResolveReportPeriodAction
{
    private const MONTHS = [
        1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril', 5 => 'mayo', 6 => 'junio',
        7 => 'julio', 8 => 'agosto', 9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre',
    ];

    public function __construct(private ResolveRequestedTimezoneAction $resolveTimezone) {}

    /**
     * @param  array  $input  filtros validados más `timezone` sin validar (RN-14)
     */
    public function execute(array $input): ReportPeriod
    {
        $timezone = $this->resolveTimezone->execute($input['timezone'] ?? null);
        $today = CarbonImmutable::now($timezone)->startOfDay();
        $type = $input['period'] ?? 'week';
        $reference = isset($input['date'])
            ? CarbonImmutable::createFromFormat('Y-m-d', $input['date'], $timezone)->startOfDay()
            : $today;

        return match ($type) {
            'week' => $this->week($reference, $today),
            'month' => $this->month($reference, $today),
            default => $this->custom($input, $timezone),
        };
    }

    private function week(CarbonImmutable $reference, CarbonImmutable $today): ReportPeriod
    {
        $from = $reference->startOfWeek(CarbonImmutable::MONDAY);
        $to = $from->addDays(6);
        $next = $from->addWeek();

        return new ReportPeriod(
            'week',
            $from,
            $to,
            'Semana del '.$this->shortDate($from).' al '.$this->shortDate($to),
            $from->subWeek()->toDateString(),
            $next->lte($today) ? $next->toDateString() : null,
        );
    }

    private function month(CarbonImmutable $reference, CarbonImmutable $today): ReportPeriod
    {
        $from = $reference->startOfMonth();
        $to = $from->endOfMonth()->startOfDay();
        $next = $from->addMonthNoOverflow();

        return new ReportPeriod(
            'month',
            $from,
            $to,
            ucfirst(self::MONTHS[$from->month]).' de '.$from->year,
            $from->subMonthNoOverflow()->toDateString(),
            $next->lte($today) ? $next->toDateString() : null,
        );
    }

    private function custom(array $input, string $timezone): ReportPeriod
    {
        if (empty($input['from']) || empty($input['to'])) {
            throw ValidationException::withMessages([
                'from' => ['Indica la fecha inicial y la fecha final del rango.'],
            ]);
        }

        $from = CarbonImmutable::createFromFormat('Y-m-d', $input['from'], $timezone)->startOfDay();
        $to = CarbonImmutable::createFromFormat('Y-m-d', $input['to'], $timezone)->startOfDay();

        if ($to->lt($from)) {
            throw ValidationException::withMessages([
                'to' => ['La fecha final no puede ser anterior a la fecha inicial.'],
            ]);
        }

        $maxDays = (int) config('arca.report_max_days');
        $calendarDays = (int) round(CarbonImmutable::parse($from->toDateString(), 'UTC')
            ->diffInDays(CarbonImmutable::parse($to->toDateString(), 'UTC'), true)) + 1;
        if ($calendarDays > $maxDays) {
            throw ValidationException::withMessages([
                'to' => ["El rango no puede exceder {$maxDays} días."],
            ]);
        }

        return new ReportPeriod(
            'custom',
            $from,
            $to,
            'Del '.$this->shortDate($from).' al '.$this->shortDate($to),
            null,
            null,
        );
    }

    private function shortDate(CarbonImmutable $date): string
    {
        return $date->day.' de '.self::MONTHS[$date->month].' de '.$date->year;
    }
}
