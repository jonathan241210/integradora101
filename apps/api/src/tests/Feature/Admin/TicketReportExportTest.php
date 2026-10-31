<?php

namespace Tests\Feature\Admin;

use App\Actions\Admin\Reports\ReportPeriod;
use App\Actions\Admin\Reports\TicketReportCsvWriter;
use App\Actions\Admin\Reports\TicketReportPdfWriter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Tests\Concerns\CreatesAdminFixtures;

class TicketReportExportTest extends AdminFeatureTestCase
{
    use CreatesAdminFixtures;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** CA-22 */
    public function test_ca22_administration_management_exports_csv_with_the_same_totals_as_the_report(): void
    {
        $admin = $this->createAccount('admin');
        $this->travelTo(Carbon::parse('2026-11-05 12:00:00', 'UTC'));
        $this->clearTickets('2026-10-25 00:00:00', '2026-12-05 00:00:00');
        $this->insertTicket('2026-11-03 05:59:00', 1, 0, '50.00');
        $this->insertTicket('2026-11-09 05:59:00', 2, 1, '120.50');

        $json = $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=week&date=2026-11-04')->assertOk()->json('data');

        $response = $this->actAs($admin)->get('/api/v1/admin/reports/tickets/export?period=week&date=2026-11-04&format=csv')->assertOk();
        $response->assertHeader('Content-Disposition', 'attachment; filename=reporte-boletos-2026-11-02_2026-11-08.csv');
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));

        $csv = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $totals = $json['totals'];
        $this->assertStringContainsString("Boletos,Adultos,Niños,\"Ingresos (MXN)\"\r\n{$totals['tickets']},{$totals['adults']},{$totals['children']},{$totals['revenue']}\r\n", $csv);
        $this->assertStringContainsString('2026-11-02,1,1,0,50.00', $csv);
        foreach ($json['tickets'] as $ticket) {
            $this->assertStringContainsString("{$ticket['folio']},\"{$ticket['purchased_at']}\",{$ticket['adults']},{$ticket['children']},{$ticket['total']}", $csv);
        }
        $this->assertStringNotContainsString('QR-', $csv);

        $this->assertStringContainsString("'=SUM", $this->csvFor('=SUM(1)'));
        $this->assertStringContainsString("'@x", $this->csvFor('@x'));
    }

    private function csvFor(string $folio): string
    {
        $day = CarbonImmutable::parse('2026-11-02', 'America/Mexico_City');
        $period = new ReportPeriod('week', $day, $day, 'Prueba', null, null);
        $handle = fopen('php://memory', 'w+');
        app(TicketReportCsvWriter::class)->write(
            $handle,
            $period,
            ['tickets' => 1, 'adults' => 1, 'children' => 0, 'revenue' => '1.00'],
            [],
            [['folio' => $folio, 'purchased_at' => '2026-11-02 10:00:00', 'adults' => 1, 'children' => 0, 'total' => '1.00']],
        );
        rewind($handle);

        return stream_get_contents($handle);
    }

    /** CA-23 */
    public function test_ca23_administration_management_exports_xlsx_with_the_same_totals_as_the_report(): void
    {
        $admin = $this->createAccount('admin');
        $this->travelTo(Carbon::parse('2026-11-05 12:00:00', 'UTC'));
        $this->clearTickets('2026-10-25 00:00:00', '2026-12-05 00:00:00');
        $this->insertTicket('2026-11-03 05:59:00', 1, 0, '50.00');
        $this->insertTicket('2026-11-09 05:59:00', 2, 1, '120.50');

        $url = '/api/v1/admin/reports/tickets/export?period=week&date=2026-11-04&timezone=Asia/Tokyo&format=xlsx';
        $json = $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=week&date=2026-11-04&timezone=Asia/Tokyo')->assertOk()->json('data');
        $response = $this->actAs($admin)->get($url)->assertOk();

        $response->assertHeader('Content-Disposition', 'attachment; filename=reporte-boletos-2026-11-02_2026-11-08.xlsx');
        $this->assertSame('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));

        $path = tempnam(sys_get_temp_dir(), 'arca-test-xlsx-');
        file_put_contents($path, $response->streamedContent());
        $zip = new \ZipArchive;
        $this->assertTrue($zip->open($path) === true, 'El xlsx no es un zip válido.');
        $xml = $zip->getFromName('xl/worksheets/sheet1.xml').($zip->getFromName('xl/sharedStrings.xml') ?: '');
        $zip->close();
        unlink($path);

        $totals = $json['totals'];
        $this->assertStringContainsString('Asia/Tokyo', $xml);
        $this->assertStringContainsString($totals['revenue'], $xml);
        $this->assertStringContainsString('Ingresos (MXN)', $xml);
        foreach ($json['tickets'] as $ticket) {
            $this->assertStringContainsString($ticket['purchased_at'], $xml);
            $this->assertStringContainsString($ticket['total'], $xml);
        }
        $this->assertStringNotContainsString('QR-', $xml);
    }

    /** CA-23 */
    public function test_ca23_administration_management_exports_pdf_and_limits_long_reports(): void
    {
        $admin = $this->createAccount('admin');
        $this->travelTo(Carbon::parse('2026-11-05 12:00:00', 'UTC'));
        $this->clearTickets('2026-10-25 00:00:00', '2026-12-05 00:00:00');
        $this->insertTicket('2026-11-03 05:59:00', 1, 0, '50.00');

        $url = '/api/v1/admin/reports/tickets/export?period=week&date=2026-11-04&format=pdf';
        $response = $this->actAs($admin)->get($url)->assertOk();
        $response->assertHeader('Content-Disposition', 'attachment; filename=reporte-boletos-2026-11-02_2026-11-08.pdf');
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertStringStartsWith('%PDF', $response->streamedContent());

        config(['arca.report_pdf_max_tickets' => 0]);
        $this->actAs($admin)->getJson($url)->assertUnprocessable()->assertJsonValidationErrors('format');
    }

    /** CA-23 */
    public function test_ca23_administration_management_rejects_formats_outside_the_enabled_list(): void
    {
        $admin = $this->createAccount('admin');
        $this->assertSame(['csv', 'xlsx', 'pdf'], config('arca.report_export_formats'));

        config(['arca.report_export_formats' => ['csv']]);
        foreach (['xlsx', 'pdf'] as $format) {
            $this->actAs($admin)->getJson("/api/v1/admin/reports/tickets/export?period=week&format={$format}")
                ->assertUnprocessable()->assertJsonPath('message', 'Formato de exportación no disponible.');
        }
        config(['arca.report_export_formats' => ['csv', 'xlsx', 'pdf']]);

        $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets/export?period=week&format=txt')
            ->assertUnprocessable()->assertJsonValidationErrors('format');
        $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets/export?period=week')
            ->assertUnprocessable()->assertJsonValidationErrors('format');
    }

    /** CA-23 */
    public function test_ca23_administration_management_renderer_failure_never_returns_a_truncated_file_with_200(): void
    {
        $admin = $this->createAccount('admin');
        $this->app->instance(TicketReportPdfWriter::class, new class extends TicketReportPdfWriter
        {
            public function write($handle, ReportPeriod $period, array $totals, array $daily, iterable $tickets): void
            {
                fwrite($handle, '%PDF-parcial');
                throw new \RuntimeException('fallo simulado del renderizador');
            }
        });

        $response = $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets/export?period=week&date=2026-11-04&format=pdf');

        $response->assertStatus(500);
        $this->assertStringNotContainsString('%PDF', (string) $response->getContent());
        $this->assertSame([], glob(storage_path('app/tmp-reports/export-*')));
    }

    /** CA-22 */
    public function test_ca22_administration_management_export_route_is_throttled_to_20_per_minute(): void
    {
        $admin = $this->createAccount('admin');

        for ($i = 0; $i < 20; $i++) {
            $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets/export?period=week&format=txt')->assertUnprocessable();
        }

        $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets/export?period=week&format=txt')->assertStatus(429);
    }
}
