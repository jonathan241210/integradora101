<?php

namespace App\Actions\Admin\Reports;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Ticket;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class ExportTicketReportAction
{
    public function __construct(
        private ResolveReportPeriodAction $resolvePeriod,
        private SummarizeTicketSalesAction $summarize,
        private TicketReportCsvWriter $csv,
        private TicketReportXlsxWriter $xlsx,
        private TicketReportPdfWriter $pdf,
        private LogAdminActivityAction $log,
    ) {}

    public function execute(array $input): Response
    {
        $format = $input['format'] ?? 'csv';

        if (! in_array($format, config('arca.report_export_formats'), true)) {
            throw ValidationException::withMessages(['format' => ['Formato de exportación no disponible.']]);
        }

        $period = $this->resolvePeriod->execute($input);

        if ($format === 'pdf') {
            $maxRows = (int) config('arca.report_pdf_max_tickets');
            $count = Ticket::query()
                ->where('purchased_at', '>=', $period->startUtc())
                ->where('purchased_at', '<', $period->endUtc())
                ->count();

            if ($count > $maxRows) {
                throw ValidationException::withMessages([
                    'format' => ["El reporte tiene demasiados boletos para PDF (máximo {$maxRows}). Acorta el periodo o exporta en CSV o Excel."],
                ]);
            }
        }

        $summary = $this->summarize->execute($period);

        $this->log->execute('report-exported', 'Reporte de boletos exportado', null, [
            'format' => $format,
            'timezone' => $period->timezone(),
            'from' => $period->from->toDateString(),
            'to' => $period->to->toDateString(),
        ]);

        $filename = "reporte-boletos-{$period->from->toDateString()}_{$period->to->toDateString()}.{$format}";

        $headers = [
            'Content-Type' => match ($format) {
                'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'pdf' => 'application/pdf',
                default => 'text/csv; charset=UTF-8',
            },
            'Cache-Control' => 'no-store',
        ];

        $rows = fn () => (function () use ($period) {
            $query = Ticket::query()
                ->select(['id', 'adult_quantity', 'child_quantity', 'total_amount', 'purchased_at'])
                ->where('purchased_at', '>=', $period->startUtc())
                ->where('purchased_at', '<', $period->endUtc())
                ->orderBy('purchased_at')
                ->orderBy('id');

            foreach ($query->cursor() as $ticket) {
                yield PresentTicketRow::from($ticket, $period->timezone());
            }
        })();

        $writer = match ($format) {
            'xlsx' => $this->xlsx,
            'pdf' => $this->pdf,
            default => $this->csv,
        };

        if ($format === 'csv') {
            return response()->streamDownload(function () use ($writer, $period, $summary, $rows) {
                $handle = fopen('php://output', 'w');
                $writer->write($handle, $period, $summary['totals'], $summary['daily'], $rows());
                fclose($handle);
            }, $filename, $headers);
        }

        // Excel y PDF se generan completos ANTES de responder: si el generador falla, la respuesta
        // es un error limpio (5xx) y nunca un archivo truncado con 200.
        $path = ReportTempDirectory::file('export-');

        try {
            $handle = fopen($path, 'wb');
            $writer->write($handle, $period, $summary['totals'], $summary['daily'], $rows());
            fclose($handle);
        } catch (\Throwable $e) {
            if (isset($handle) && is_resource($handle)) {
                fclose($handle);
            }
            @unlink($path);

            throw $e;
        }

        return response()->download($path, $filename, $headers)->deleteFileAfterSend(true);
    }
}
