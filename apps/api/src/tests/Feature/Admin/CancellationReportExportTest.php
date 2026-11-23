<?php

namespace Tests\Feature\Admin;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\CancellationReview;
use Spatie\Activitylog\Models\Activity;

class CancellationReportExportTest extends CancellationReportTestCase
{
    private function fixture(): array
    {
        $admin = $this->createAccount('admin', true, ['first_name' => 'Presidencia']);
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Cajero']);
        $this->clean();
        $this->insertSale($cashier, '2033-03-08 16:00:00', ['total_amount' => '41.00']);
        $id = $this->cancelledSale($cashier, '2033-03-08 17:00:00', 5, 'other', 'Comentario con acentos ñ y más texto', ['total_amount' => '25.00']);

        return [$admin, $cashier, $id];
    }

    private function xlsxText(string $content): string
    {
        $path = tempnam(sys_get_temp_dir(), 'cx');
        file_put_contents($path, $content);
        $zip = new \ZipArchive;
        $zip->open($path);
        $text = (string) $zip->getFromName('xl/sharedStrings.xml').(string) $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        @unlink($path);

        return html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    /** CA-19 ticket-cancellation-report */
    public function test_ca19_three_formats_share_rows_totals_and_metadata_block(): void
    {
        [$admin, , $id] = $this->fixture();

        $response = $this->actAs($admin)->get(self::URL.'/export?'.self::WEEK.'&format=csv')->assertOk();
        $response->assertHeader('Content-Disposition', 'attachment; filename=reporte-cancelaciones-2033-03-07_2033-03-13.csv');
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $csv = $response->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        foreach (['Generado por', 'Presidencia Prueba (admin)', 'Generado (UTC)', 'Generado (zona de negocio)', 'Periodo', 'Zona horaria', 'America/Mexico_City', 'Filtro de cajero', 'Filtro de motivo', 'Comentario', 'Comentario con acentos ñ y más texto', "{$id},1,0,25.00", '2033-03-08,66.00,25.00,41.00'] as $needle) {
            $this->assertStringContainsString($needle, $csv, $needle);
        }

        $xlsx = $this->xlsxText($this->actAs($admin)->get(self::URL.'/export?'.self::WEEK.'&format=xlsx')->assertOk()->streamedContent());
        foreach (['Generado por', 'Presidencia Prueba (admin)', 'Generado (UTC)', 'America/Mexico_City', 'Comentario con acentos ñ y más texto', '25.00', '66.00'] as $needle) {
            $this->assertStringContainsString($needle, $xlsx, $needle);
        }

        $pdf = $this->actAs($admin)->get(self::URL.'/export?'.self::WEEK.'&format=pdf')->assertOk();
        $this->assertStringContainsString('application/pdf', $pdf->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF', $pdf->streamedContent());
    }

    /** CA-20 ticket-cancellation-report */
    public function test_ca20_unknown_format_is_422(): void
    {
        [$admin] = $this->fixture();

        foreach (['doc', '', null] as $format) {
            $this->actAs($admin)->getJson(self::URL.'/export?'.self::WEEK.($format === null ? '' : '&format='.$format))
                ->assertStatus(422)->assertJsonPath('message', 'Formato de exportación no disponible.');
        }
    }

    /** CA-20 ticket-cancellation-report */
    public function test_ca20_pdf_over_max_rows_is_422_with_limit(): void
    {
        [$admin] = $this->fixture();
        config(['arca.report_pdf_max_tickets' => 0]);

        $this->actAs($admin)->getJson(self::URL.'/export?'.self::WEEK.'&format=pdf')
            ->assertStatus(422)->assertJsonValidationErrors(['format'], 'errors')
            ->assertJsonPath('errors.format.0', fn ($m) => str_contains($m, 'máximo 0'));
        $this->actAs($admin)->get(self::URL.'/export?'.self::WEEK.'&format=csv')->assertOk();
    }

    /** CA-20 ticket-cancellation-report (RN-10): el tope del PDF cuenta las filas de todas las secciones, no solo los boletos. */
    public function test_ca20_pdf_limit_counts_rows_of_every_section(): void
    {
        [$admin] = $this->fixture();

        // Un boleto cancelado, pero el documento tiene 6 filas: por cajero, por motivo, día, cajero, cajero y día, boleto.
        config(['arca.report_pdf_max_tickets' => 5]);
        $this->actAs($admin)->getJson(self::URL.'/export?'.self::WEEK.'&format=pdf')
            ->assertStatus(422)
            ->assertJsonPath('errors.format.0', fn ($m) => str_contains($m, 'demasiadas filas') && str_contains($m, 'máximo 5'));

        config(['arca.report_pdf_max_tickets' => 6]);
        $this->actAs($admin)->get(self::URL.'/export?'.self::WEEK.'&format=pdf')->assertOk();
    }

    /** CA-21 ticket-cancellation-report */
    public function test_ca21_export_is_audited_with_actor_format_period_filters(): void
    {
        [$admin, $cashier] = $this->fixture();

        $this->actAs($admin)->get(self::URL.'/export?'.self::WEEK.'&format=csv&cashier_id='.$cashier->id.'&reason_code=other')->assertOk();

        $log = Activity::query()->where('event', 'report-cancellations-exported')->where('causer_id', $admin->id)->latest('id')->firstOrFail();
        $this->assertSame('csv', $log->properties['format']);
        $this->assertSame('2033-03-07', $log->properties['from']);
        $this->assertSame('2033-03-13', $log->properties['to']);
        $this->assertSame('custom', $log->properties['type']);
        $this->assertSame('America/Mexico_City', $log->properties['timezone']);
        $this->assertSame(['cashier_id' => $cashier->id, 'reason_code' => 'other'], $log->properties['filters']);
    }

    /** CA-21 ticket-cancellation-report */
    public function test_ca21_audit_failure_returns_error_without_file(): void
    {
        [$admin] = $this->fixture();
        $this->mock(LogAdminActivityAction::class)->shouldReceive('execute')->andThrow(new \RuntimeException('audit down'));

        $response = $this->actAs($admin)->getJson(self::URL.'/export?'.self::WEEK.'&format=csv');

        $this->assertGreaterThanOrEqual(500, $response->status());
        $this->assertNull($response->headers->get('Content-Disposition'));
    }

    /** CA-25 cancellation-review-signals */
    public function test_ca25_three_formats_include_traffic_light_and_legend(): void
    {
        [$admin, $cashier] = $this->fixture();
        $this->actAs($admin);
        CancellationReview::query()->create([
            'cashier_id' => $cashier->id, 'business_date' => '2033-03-08', 'status' => 'clarification_required',
            'note' => 'Pide explicar la cancelación.', 'reviewed_by' => $admin->id,
        ]);

        $needles = ['Semáforo por cajero y día', 'Leyenda del semáforo', 'Normal', 'Sin acción: no hay señales que revisar.',
            'Requiere aclaración: Pide explicar la cancelación.', 'Una alerta no prueba nada: solo indica qué revisar.',
            'Por encima de su promedio', 'Sin cajero registrado'];
        $this->insertSale(null, '2033-03-09 16:00:00');

        $csv = $this->actAs($admin)->get(self::URL.'/export?'.self::WEEK.'&format=csv')->assertOk()->streamedContent();
        foreach ($needles as $needle) {
            $this->assertStringContainsString($needle, $csv, $needle);
        }
        $this->assertMatchesRegularExpression('/2033-03-08"?,"?Cajero Prueba"?,"?Normal/', $csv);

        $xlsx = $this->xlsxText($this->actAs($admin)->get(self::URL.'/export?'.self::WEEK.'&format=xlsx')->assertOk()->streamedContent());
        foreach ($needles as $needle) {
            $this->assertStringContainsString($needle, $xlsx, $needle);
        }

        $pdf = $this->actAs($admin)->get(self::URL.'/export?'.self::WEEK.'&format=pdf')->assertOk();
        $this->assertStringStartsWith('%PDF', $pdf->streamedContent());
        $pdf->assertHeader('Content-Type', 'application/pdf');
    }
}
