<?php

namespace App\Actions\Admin\Reports;

class TicketReportCsvWriter
{
    /**
     * @param  resource  $handle
     * @param  iterable<array>  $tickets  filas ya presentadas (folio, purchased_at, adults, children, total)
     */
    public function write($handle, ReportPeriod $period, array $totals, array $daily, iterable $tickets): void
    {
        fwrite($handle, "\xEF\xBB\xBF");

        $this->row($handle, ['Reporte de boletos']);
        $this->row($handle, ['Periodo', $period->label]);
        $this->row($handle, ['Desde', $period->from->toDateString()]);
        $this->row($handle, ['Hasta', $period->to->toDateString()]);
        $this->row($handle, ['Zona horaria', $period->timezone()]);
        $this->row($handle, []);

        $this->row($handle, ['Totales']);
        $this->row($handle, ['Boletos', 'Adultos', 'Niños', 'Ingresos (MXN)']);
        $this->row($handle, [$totals['tickets'], $totals['adults'], $totals['children'], $totals['revenue']]);
        $this->row($handle, []);

        $this->row($handle, ['Desglose por día']);
        $this->row($handle, ['Fecha', 'Boletos', 'Adultos', 'Niños', 'Ingresos (MXN)']);
        foreach ($daily as $day) {
            $this->row($handle, [$day['date'], $day['tickets'], $day['adults'], $day['children'], $day['revenue']]);
        }
        $this->row($handle, []);

        $this->row($handle, ['Boletos']);
        $this->row($handle, ['Folio', 'Fecha y hora', 'Adultos', 'Niños', 'Total (MXN)']);
        foreach ($tickets as $ticket) {
            $this->row($handle, [$ticket['folio'], $ticket['purchased_at'], $ticket['adults'], $ticket['children'], $ticket['total']]);
        }
    }

    private function row($handle, array $values): void
    {
        if ($values === []) {
            fwrite($handle, "\r\n");

            return;
        }

        fputcsv($handle, array_map([$this, 'sanitize'], $values), ',', '"', '\\', "\r\n");
    }

    private function sanitize(mixed $value): mixed
    {
        if (is_string($value) && $value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'".$value;
        }

        return $value;
    }
}
