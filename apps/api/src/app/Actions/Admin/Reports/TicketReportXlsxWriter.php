<?php

namespace App\Actions\Admin\Reports;

use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;

/**
 * Exporta el reporte a .xlsx en streaming (OpenSpout) con las mismas secciones que el CSV.
 * Los importes salen como cadena de dos decimales, igual que el JSON, para no perder precisión.
 */
class TicketReportXlsxWriter
{
    /**
     * @param  resource  $handle
     * @param  iterable<array>  $tickets  filas ya presentadas (folio, purchased_at, adults, children, total)
     */
    public function write($handle, ReportPeriod $period, array $totals, array $daily, iterable $tickets): void
    {
        // El zip necesita un destino con acceso aleatorio: se escribe a un temporal y se copia a la salida.
        $path = ReportTempDirectory::file('xlsx-');

        try {
            $writer = new Writer;
            $writer->openToFile($path);

            $this->row($writer, ['Reporte de boletos']);
            $this->row($writer, ['Periodo', $period->label]);
            $this->row($writer, ['Desde', $period->from->toDateString()]);
            $this->row($writer, ['Hasta', $period->to->toDateString()]);
            $this->row($writer, ['Zona horaria', $period->timezone()]);
            $this->row($writer, []);

            $this->row($writer, ['Totales']);
            $this->row($writer, ['Boletos', 'Adultos', 'Niños', 'Ingresos (MXN)']);
            $this->row($writer, [$totals['tickets'], $totals['adults'], $totals['children'], $totals['revenue']]);
            $this->row($writer, []);

            $this->row($writer, ['Desglose por día']);
            $this->row($writer, ['Fecha', 'Boletos', 'Adultos', 'Niños', 'Ingresos (MXN)']);
            foreach ($daily as $day) {
                $this->row($writer, [$day['date'], $day['tickets'], $day['adults'], $day['children'], $day['revenue']]);
            }
            $this->row($writer, []);

            $this->row($writer, ['Boletos']);
            $this->row($writer, ['Folio', 'Fecha y hora', 'Adultos', 'Niños', 'Total (MXN)']);
            foreach ($tickets as $ticket) {
                $this->row($writer, [$ticket['folio'], $ticket['purchased_at'], $ticket['adults'], $ticket['children'], $ticket['total']]);
            }

            $writer->close();

            $file = fopen($path, 'rb');
            stream_copy_to_stream($file, $handle);
            fclose($file);
        } finally {
            @unlink($path);
        }
    }

    private function row(Writer $writer, array $values): void
    {
        $writer->addRow(Row::fromValues(array_map([$this, 'sanitize'], $values)));
    }

    /** Neutraliza inyección de fórmulas en celdas de texto. */
    private function sanitize(mixed $value): mixed
    {
        if (is_string($value) && $value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'".$value;
        }

        return $value;
    }
}
