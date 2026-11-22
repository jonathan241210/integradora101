<?php

namespace App\Actions\Admin\Reports;

use App\Actions\Admin\LogAdminActivityAction;
use App\Enums\TicketCancellationReason;
use App\Models\User;
use App\Support\BusinessTimezone;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

/** Exportación del reporte de cancelaciones (api-022 CA-19 a CA-21). */
class ExportCancellationReportAction
{
    public function __construct(
        private BuildCancellationReportAction $build,
        private ReportDocumentWriter $writer,
        private LogAdminActivityAction $log,
    ) {}

    public function execute(User $actor, array $input): Response
    {
        $format = $input['format'] ?? 'csv';

        if (! in_array($format, config('arca.report_export_formats'), true)) {
            throw ValidationException::withMessages(['format' => ['Formato de exportación no disponible.']]);
        }

        $report = $this->build->execute($input);
        /** @var ReportPeriod $period */
        $period = $report['period'];

        $maxRows = (int) config('arca.report_pdf_max_tickets');
        if ($format === 'pdf' && $this->documentRows($report) > $maxRows) {
            throw ValidationException::withMessages([
                'format' => ["El reporte tiene demasiadas filas para PDF (máximo {$maxRows}). Acorta el periodo o exporta en CSV o Excel."],
            ]);
        }

        $filters = [
            'cashier_id' => isset($input['cashier_id']) ? (int) $input['cashier_id'] : null,
            'reason_code' => $input['reason_code'] ?? null,
        ];

        // Auditoría antes de entregar: si falla, no hay archivo (CA-21).
        $this->log->execute('report-cancellations-exported', 'Reporte de cancelaciones exportado', null, [
            'format' => $format,
            'type' => $period->type,
            'from' => $period->from->toDateString(),
            'to' => $period->to->toDateString(),
            'timezone' => $period->timezone(),
            'filters' => $filters,
        ]);

        $document = $this->document($actor, $report, $filters, $format);
        $filename = "reporte-cancelaciones-{$period->from->toDateString()}_{$period->to->toDateString()}.{$format}";
        $headers = [
            'Content-Type' => match ($format) {
                'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'pdf' => 'application/pdf',
                default => 'text/csv; charset=UTF-8',
            },
            'Cache-Control' => 'no-store',
        ];

        // Todo se genera completo ANTES de responder: un fallo es un error limpio y nunca un archivo parcial.
        $path = ReportTempDirectory::file('cancellations-');

        try {
            $handle = fopen($path, 'wb');
            $this->writer->{$format}($handle, $document);
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

    private function document(User $actor, array $report, array $filters, string $format): ReportDocument
    {
        /** @var ReportPeriod $period */
        $period = $report['period'];
        $now = CarbonImmutable::now('UTC');
        $zone = BusinessTimezone::name();
        $local = fn (?string $iso): string => $iso === null ? '' : CarbonImmutable::parse($iso)->setTimezone($zone)->format('Y-m-d H:i:s');
        $totals = $report['totals'];
        $yesNo = fn (bool $value): string => $value ? 'Sí' : 'No';
        $labels = array_column($report['legend'], 'label', 'code');

        $cashierFilter = 'Todos';
        if ($filters['cashier_id'] !== null) {
            $cashierFilter = PresentCancelledTicketRow::personName(User::withTrashed()->find($filters['cashier_id'])) ?? (string) $filters['cashier_id'];
        }
        $reasonFilter = $filters['reason_code'] === null
            ? 'Todos'
            : TicketCancellationReason::from($filters['reason_code'])->label();

        $metadata = [
            ['Generado por', PresentCancelledTicketRow::personName($actor).' ('.($actor->getRoleNames()->first() ?? 'sin rol').')'],
            ['Generado (UTC)', $now->format('Y-m-d H:i:s').' UTC'],
            ['Generado (zona de negocio)', $now->setTimezone($zone)->format('Y-m-d H:i:s').' '.$zone],
            ['Periodo', $period->label],
            ['Desde', $period->from->toDateString()],
            ['Hasta', $period->to->toDateString()],
            ['Zona horaria', $period->timezone()],
            ['Filtro de cajero', $cashierFilter],
            ['Filtro de motivo', $reasonFilter],
            ['Formato', $format],
        ];

        $conciliation = fn (array $row): array => [$row['gross'], $row['cancelled'], $row['net'], $yesNo($row['balanced'])];

        return new ReportDocument('Reporte de cancelaciones de boletos', $metadata, [
            [
                'title' => 'Totales',
                'headers' => ['Boletos cancelados', 'Importe cancelado (MXN)'],
                'rows' => [[$totals['cancelled_tickets'], $totals['cancelled_amount']]],
            ],
            [
                'title' => 'Cancelaciones por cajero',
                'headers' => ['Cajero', 'Boletos cancelados', 'Importe cancelado (MXN)'],
                'rows' => array_map(fn ($r) => [$r['cashier_name'], $r['cancelled_tickets'], $r['cancelled_amount']], $totals['by_cashier']),
            ],
            [
                'title' => 'Cancelaciones por motivo',
                'headers' => ['Motivo', 'Boletos cancelados', 'Importe cancelado (MXN)'],
                'rows' => array_map(fn ($r) => [$r['reason_label'], $r['cancelled_tickets'], $r['cancelled_amount']], $totals['by_reason']),
            ],
            [
                'title' => 'Conciliación por día (bruto = neto + cancelado)',
                'headers' => ['Fecha', 'Bruto (MXN)', 'Cancelado (MXN)', 'Neto (MXN)', 'Cuadra'],
                'rows' => array_map(fn ($r) => [$r['date'], ...$conciliation($r)], $report['reconciliation']['days']),
            ],
            [
                'title' => 'Conciliación por cajero',
                'headers' => ['Cajero', 'Bruto (MXN)', 'Cancelado (MXN)', 'Neto (MXN)', 'Cuadra', 'Días con actividad', 'Boletos vendidos', 'Cancelación (%)', 'Días por revisar'],
                'rows' => array_map(fn ($r) => [
                    $r['cashier_name'], ...$conciliation($r), implode(' ', $r['active_days']), $r['sold_tickets'], $r['cancel_percent'],
                    $this->daysToReview($r['days_to_review']),
                ], $report['reconciliation']['cashiers']),
            ],
            [
                'title' => 'Semáforo por cajero y día',
                'headers' => ['Fecha', 'Cajero', 'Nivel', 'Porqué', 'Qué hacer', 'Folios', 'Revisión vigente'],
                'rows' => array_map(fn ($r) => [
                    $r['date'], $r['cashier_name'], $r['traffic_light_label'] ?? 'No aplica',
                    $r['reason_sentence'] ?? '', $r['action'],
                    implode('; ', array_map(fn ($reason) => $reason['label'].': '.implode(', ', $reason['folios']), $r['reasons'])),
                    $r['review'] === null
                        ? ($r['traffic_light'] === null ? 'No aplica' : 'Sin revisión')
                        : "{$r['review']['status_label']}: {$r['review']['note']} ({$r['review']['reviewed_by_name']}, {$local($r['review']['reviewed_at'])})",
                ], $report['reconciliation']['cashier_days']),
            ],
            [
                'title' => 'Leyenda del semáforo',
                'headers' => ['Señal', 'Qué significa', 'Límite'],
                'rows' => [
                    ...array_map(fn ($l) => [$l['label'], $l['explanation'], $l['limit']], $report['legend']),
                    ['Aviso', $report['disclaimer'], ''],
                ],
            ],
            [
                'title' => 'Boletos cancelados (fechas en hora de negocio)',
                'headers' => ['Folio', 'Adultos', 'Niños', 'Importe (MXN)', 'Venta', 'Cancelación', 'Cajero', 'Canceló', 'Motivo', 'Comentario', 'Minutos hasta cancelar', 'Cancelación tardía (más de '.(int) config('arca.cancellation_alerts.cancel_after_minutes').' min)', 'Señales'],
                'rows' => array_map(fn ($r) => [
                    $r['folio'], $r['adult_quantity'], $r['child_quantity'], $r['total_amount'],
                    $local($r['purchased_at']), $local($r['cancelled_at']), $r['cashier_name'], $r['cancelled_by_name'],
                    $r['reason_label'], $r['comment'] ?? '', $r['minutes_to_cancel'],
                    $yesNo($r['late_cancellation']),
                    implode('; ', array_map(fn ($code) => $labels[$code] ?? $code, $r['signal_codes'])),
                ], $report['rows']),
            ],
        ]);
    }

    /** Filas del documento (RN-10): boletos cancelados más las filas de cada sección (cajero y día incluido). */
    private function documentRows(array $report): int
    {
        return count($report['rows'])
            + count($report['totals']['by_cashier'])
            + count($report['totals']['by_reason'])
            + count($report['reconciliation']['days'])
            + count($report['reconciliation']['cashiers'])
            + count($report['reconciliation']['cashier_days']);
    }

    /** «2 en Atención · 3 en Revisar»; «Ninguno» si no hay días por revisar. */
    private function daysToReview(array $days): string
    {
        $parts = [];
        if ($days['attention'] > 0) {
            $parts[] = "{$days['attention']} en Atención";
        }
        if ($days['review'] > 0) {
            $parts[] = "{$days['review']} en Revisar";
        }

        return $parts === [] ? 'Ninguno' : implode(' · ', $parts);
    }
}
