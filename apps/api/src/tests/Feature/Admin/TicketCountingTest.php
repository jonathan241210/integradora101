<?php

namespace Tests\Feature\Admin;

use App\Actions\Admin\Reports\ReportPeriod;
use App\Actions\Admin\Reports\TicketReportPdfWriter;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesAdminFixtures;

class TicketCountingTest extends AdminFeatureTestCase
{
    use CreatesAdminFixtures;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** CA-29 */
    public function test_ca29_administration_management_counts_tickets_as_sum_of_quantities(): void
    {
        $admin = $this->createAccount('admin');
        $this->travelTo(Carbon::parse('2026-11-05 12:00:00', 'UTC'));
        $this->clearTickets('2026-10-25 00:00:00', '2026-12-05 00:00:00');

        // Compra de 1 adulto y 3 niños: cuatro boletos individuales.
        $this->insertTicket('2026-11-05 10:00:00', 1, 0, '25.00');
        $this->insertTicket('2026-11-05 10:00:00', 0, 1, '16.00');
        $cancelledChild = $this->insertTicket('2026-11-05 10:00:00', 0, 1, '16.00');
        $this->insertTicket('2026-11-05 10:00:00', 0, 1, '16.00');

        $totals = fn () => $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=week&date=2026-11-05')->assertOk()->json('data.totals');
        $this->assertSame(['tickets' => 4, 'adults' => 1, 'children' => 3, 'revenue' => '73.00'], $totals());
        $dashboard = $this->actAs($admin)->getJson('/api/v1/admin/dashboard')->assertOk()->json('data');
        $this->assertSame(['tickets' => 4, 'adults' => 1, 'children' => 3, 'revenue' => '73.00'], $dashboard['today']);

        DB::table('tickets')->where('id', $cancelledChild)->update(['status' => 'cancelled', 'cancelled_at' => '2026-11-05 11:00:00', 'cancellation_reason' => 'Prueba']);
        $this->assertSame(['tickets' => 3, 'adults' => 1, 'children' => 2, 'revenue' => '57.00'], $totals());

        // Fila anterior con varias cantidades: cuenta por sus cantidades.
        $this->insertTicket('2026-11-05 10:30:00', 2, 0, '50.00');
        $this->assertSame(['tickets' => 5, 'adults' => 3, 'children' => 2, 'revenue' => '107.00'], $totals());

        $csv = $this->actAs($admin)->get('/api/v1/admin/reports/tickets/export?period=week&date=2026-11-05&format=csv')->assertOk()->streamedContent();
        $this->assertStringContainsString('5,3,2,107.00', $csv);
    }

    /** CA-29 */
    public function test_ca29_administration_management_xlsx_and_pdf_writer_receive_the_sum_of_quantities(): void
    {
        $admin = $this->createAccount('admin');
        $this->travelTo(Carbon::parse('2026-11-05 12:00:00', 'UTC'));
        $this->clearTickets('2026-10-25 00:00:00', '2026-12-05 00:00:00');
        $this->insertTicket('2026-11-05 10:00:00', 1, 0, '25.00');
        $this->insertTicket('2026-11-05 10:00:00', 0, 1, '16.00');
        $this->insertTicket('2026-11-05 10:30:00', 2, 0, '50.00'); // fila anterior con varias cantidades

        // XLSX: se lee el archivo; fila de totales: Boletos 4, Adultos 3, Niños 1, Ingresos 91.00.
        $response = $this->actAs($admin)->get('/api/v1/admin/reports/tickets/export?period=week&date=2026-11-05&format=xlsx')->assertOk();
        $path = tempnam(sys_get_temp_dir(), 'arca-test-xlsx-');
        file_put_contents($path, $response->streamedContent());
        $zip = new \ZipArchive;
        $this->assertTrue($zip->open($path) === true, 'El xlsx no es un zip válido.');
        $sheet = (string) $zip->getFromName('xl/worksheets/sheet1.xml');
        $strings = (string) $zip->getFromName('xl/sharedStrings.xml');
        $zip->close();
        unlink($path);
        $this->assertStringContainsString('Boletos', $sheet.$strings);
        $this->assertMatchesRegularExpression('/<v>4<\/v>|>4<\/t>|>4<\/c>|inlineStr.*?>4</s', $sheet.$strings);
        $this->assertStringContainsString('91.00', $sheet.$strings);

        // PDF: el texto del PDF viene comprimido; se verifica lo que recibe el escritor (totales ya calculados).
        $captured = null;
        $this->app->instance(TicketReportPdfWriter::class, new class($captured) extends TicketReportPdfWriter
        {
            public function __construct(private &$captured) {}

            public function write($handle, ReportPeriod $period, array $totals, array $daily, iterable $tickets): void
            {
                $this->captured = $totals;
                fwrite($handle, '%PDF-stub');
            }
        });
        // Enviar la respuesta borra el archivo temporal (deleteFileAfterSend).
        $pdf = $this->actAs($admin)->get('/api/v1/admin/reports/tickets/export?period=week&date=2026-11-05&format=pdf')->assertOk();
        $this->assertStringStartsWith('%PDF', $pdf->streamedContent());
        $this->assertSame(['tickets' => 4, 'adults' => 3, 'children' => 1, 'revenue' => '91.00'], $captured);
    }
}
