<?php

namespace App\Actions\Admin\Reports;

use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * Exporta el reporte a PDF (Dompdf) con las mismas secciones que el CSV.
 * Sin recursos remotos ni PHP embebido; todo texto se escapa.
 */
class TicketReportPdfWriter
{
    /**
     * @param  resource  $handle
     * @param  iterable<array>  $tickets  filas ya presentadas (folio, purchased_at, adults, children, total)
     */
    public function write($handle, ReportPeriod $period, array $totals, array $daily, iterable $tickets): void
    {
        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('isPhpEnabled', false);
        $options->set('isJavascriptEnabled', false);
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('tempDir', ReportTempDirectory::path());
        $options->set('fontCache', ReportTempDirectory::path());

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($this->html($period, $totals, $daily, $tickets), 'UTF-8');
        $dompdf->setPaper('letter');
        $dompdf->render();

        fwrite($handle, $dompdf->output());
    }

    private function html(ReportPeriod $period, array $totals, array $daily, iterable $tickets): string
    {
        $dailyRows = '';
        foreach ($daily as $day) {
            $dailyRows .= $this->tr([$day['date'], $day['tickets'], $day['adults'], $day['children'], $day['revenue']]);
        }
        $ticketRows = '';
        foreach ($tickets as $ticket) {
            $ticketRows .= $this->tr([$ticket['folio'], $ticket['purchased_at'], $ticket['adults'], $ticket['children'], $ticket['total']]);
        }

        return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>'
            .'body{font-family:"DejaVu Sans",sans-serif;font-size:10px;color:#222}'
            .'h1{font-size:16px}h2{font-size:12px;margin-top:16px}'
            .'table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:3px 5px;text-align:left}'
            .'th{background:#eee}'
            .'</style></head><body>'
            .'<h1>Reporte de boletos</h1>'
            .'<p>Periodo: '.$this->e($period->label).'<br>'
            .'Desde: '.$this->e($period->from->toDateString()).'<br>'
            .'Hasta: '.$this->e($period->to->toDateString()).'<br>'
            .'Zona horaria: '.$this->e($period->timezone()).'</p>'
            .'<h2>Totales</h2><table>'.$this->tr(['Boletos', 'Adultos', 'Niños', 'Ingresos (MXN)'], 'th')
            .$this->tr([$totals['tickets'], $totals['adults'], $totals['children'], $totals['revenue']]).'</table>'
            .'<h2>Desglose por día</h2><table>'.$this->tr(['Fecha', 'Boletos', 'Adultos', 'Niños', 'Ingresos (MXN)'], 'th').$dailyRows.'</table>'
            .'<h2>Boletos</h2><table>'.$this->tr(['Folio', 'Fecha y hora', 'Adultos', 'Niños', 'Total (MXN)'], 'th').$ticketRows.'</table>'
            .'</body></html>';
    }

    private function tr(array $cells, string $tag = 'td'): string
    {
        return '<tr>'.implode('', array_map(fn ($cell) => "<{$tag}>".$this->e((string) $cell)."</{$tag}>", $cells)).'</tr>';
    }

    private function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
