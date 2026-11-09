<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesAdminFixtures;

class ReportExcludesCancelledTicketsTest extends AdminFeatureTestCase
{
    use CreatesAdminFixtures;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** CA-34 de api-009: los boletos cancelados no cuentan en panel, reporte, listado ni exportación de api-007. */
    public function test_ca34_ticket_sales_cancelled_tickets_are_excluded_from_dashboard_reports_and_exports(): void
    {
        $admin = $this->createAccount('admin');
        $this->travelTo(Carbon::parse('2026-11-05 12:00:00', 'UTC'));
        $this->clearTickets('2026-10-25 00:00:00', '2026-12-05 00:00:00');

        $kept = $this->insertTicket('2026-11-05 10:00:00', 2, 1, '66.00');
        $cancelled = $this->insertTicket('2026-11-05 11:00:00', 5, 5, '205.00');
        DB::table('tickets')->where('id', $cancelled)->update(['status' => 'cancelled', 'cancelled_at' => '2026-11-05 11:30:00', 'cancellation_reason' => 'Prueba']);

        // Panel (api-007 CA-19)
        $dashboard = $this->actAs($admin)->getJson('/api/v1/admin/dashboard')->assertOk()->json('data');
        $this->assertSame(['tickets' => 3, 'adults' => 2, 'children' => 1, 'revenue' => '66.00'], $dashboard['today']);
        $this->assertSame(['tickets' => 3, 'adults' => 2, 'children' => 1, 'revenue' => '66.00'], $dashboard['last_7_days']);
        $this->assertSame('66.00', end($dashboard['series'])['revenue']);

        // Reporte: totales, desglose y listado (api-007 CA-20)
        $report = $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=week&date=2026-11-05')->assertOk();
        $this->assertSame(['tickets' => 3, 'adults' => 2, 'children' => 1, 'revenue' => '66.00'], $report->json('data.totals'));
        $this->assertSame([(string) $kept], array_column($report->json('data.tickets'), 'folio'));
        $this->assertSame(1, $report->json('meta.total'));
        $day = collect($report->json('data.daily'))->firstWhere('date', '2026-11-05');
        $this->assertSame(3, $day['tickets']);
        $this->assertSame('66.00', $day['revenue']);

        // Exportación (api-007 CA-22 y CA-23): mismos boletos y totales
        $csv = $this->actAs($admin)->get('/api/v1/admin/reports/tickets/export?period=week&date=2026-11-05&format=csv')->assertOk()->streamedContent();
        $this->assertStringContainsString('66.00', $csv);
        $this->assertStringNotContainsString('205.00', $csv);
        $this->assertStringContainsString((string) $kept, $csv);
        $this->assertDoesNotMatchRegularExpression('/(^|\n)'.$cancelled.',/', $csv);

        // XLSX: contenido (totales y filas) sin el boleto cancelado.
        $response = $this->actAs($admin)->get('/api/v1/admin/reports/tickets/export?period=week&date=2026-11-05&format=xlsx')->assertOk();
        $path = tempnam(sys_get_temp_dir(), 'arca-test-xlsx-');
        file_put_contents($path, $response->streamedContent());
        $zip = new \ZipArchive;
        $this->assertTrue($zip->open($path) === true, 'El xlsx no es un zip válido.');
        $xml = $zip->getFromName('xl/worksheets/sheet1.xml').($zip->getFromName('xl/sharedStrings.xml') ?: '');
        $zip->close();
        unlink($path);
        $this->assertStringContainsString('66.00', $xml);
        $this->assertStringNotContainsString('205.00', $xml);
        $this->assertStringNotContainsString('2026-11-05 11:00', $xml);
        $this->assertMatchesRegularExpression('/>'.$kept.'</', $xml);
        $this->assertDoesNotMatchRegularExpression('/>'.$cancelled.'</', $xml);
    }

    /** CA-34: el límite de filas del PDF (api-007 CA-23) solo cuenta boletos completados. */
    public function test_ca34_ticket_sales_pdf_row_limit_ignores_cancelled_tickets(): void
    {
        $admin = $this->createAccount('admin');
        $this->travelTo(Carbon::parse('2026-11-05 12:00:00', 'UTC'));
        $this->clearTickets('2026-10-25 00:00:00', '2026-12-05 00:00:00');

        $this->insertTicket('2026-11-05 10:00:00', 2, 1, '66.00');
        foreach (['2026-11-05 11:00:00', '2026-11-05 11:05:00'] as $at) {
            $id = $this->insertTicket($at, 5, 5, '205.00');
            DB::table('tickets')->where('id', $id)->update(['status' => 'cancelled', 'cancelled_at' => '2026-11-05 11:30:00']);
        }
        $url = '/api/v1/admin/reports/tickets/export?period=week&date=2026-11-05&format=pdf';

        // 3 boletos en total pero 1 completado: con límite 1 el PDF se genera (si contara cancelados, sería 422).
        config(['arca.report_pdf_max_tickets' => 1]);
        $response = $this->actAs($admin)->get($url)->assertOk();
        $this->assertStringStartsWith('%PDF', $response->streamedContent());

        // Con límite 0 el único completado ya excede: 422.
        config(['arca.report_pdf_max_tickets' => 0]);
        $this->actAs($admin)->getJson($url)->assertUnprocessable()->assertJsonValidationErrors('format');
    }
}
