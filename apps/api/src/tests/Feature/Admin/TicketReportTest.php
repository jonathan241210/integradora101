<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Carbon;
use Tests\Concerns\CreatesAdminFixtures;

class TicketReportTest extends AdminFeatureTestCase
{
    use CreatesAdminFixtures;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function seedTickets(): void
    {
        $this->travelTo(Carbon::parse('2026-11-05 12:00:00', 'UTC'));
        $this->clearTickets('2026-10-25 00:00:00', '2026-12-05 00:00:00');

        $this->insertTicket('2026-11-03 05:59:00', 1, 0, '50.00');   // 2026-11-02 23:59 local
        $this->insertTicket('2026-11-02 05:59:00', 4, 4, '400.00');  // 2026-11-01 23:59 local (semana anterior)
        $this->insertTicket('2026-11-09 05:59:00', 2, 1, '120.50');  // 2026-11-08 23:59 local
        $this->insertTicket('2026-11-09 06:00:00', 5, 5, '500.00');  // 2026-11-09 00:00 local (semana siguiente)
        $this->insertTicket('2026-10-31 20:00:00', 1, 1, '75.00');   // 2026-10-31 14:00 local
    }

    /** CA-20 */
    public function test_ca20_administration_management_reports_week_and_month_in_mexico_city_time(): void
    {
        $admin = $this->createAccount('admin');
        $this->seedTickets();

        $week = $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=week&date=2026-11-04')->assertOk();
        $data = $week->json('data');

        $this->assertSame('week', $data['period']['type']);
        $this->assertSame('2026-11-02', $data['period']['from']);
        $this->assertSame('2026-11-08', $data['period']['to']);
        $this->assertSame('2026-10-26', $data['period']['previous_date']);
        $this->assertNull($data['period']['next_date']);
        $this->assertSame(['tickets' => 2, 'adults' => 3, 'children' => 1, 'revenue' => '170.50'], $data['totals']);
        $this->assertCount(7, $data['daily']);
        $this->assertSame(['date' => '2026-11-02', 'tickets' => 1, 'adults' => 1, 'children' => 0, 'revenue' => '50.00'], $data['daily'][0]);
        $this->assertSame('120.50', $data['daily'][6]['revenue']);
        $this->assertSame(0, $data['daily'][3]['tickets']);
        $this->assertCount(2, $data['tickets']);
        $this->assertSame('2026-11-02 23:59:00', $data['tickets'][0]['purchased_at']);
        $this->assertSame('2026-11-08 23:59:00', $data['tickets'][1]['purchased_at']);
        $this->assertSame(['folio', 'purchased_at', 'adults', 'children', 'total'], array_keys($data['tickets'][0]));
        $this->assertStringNotContainsString('qr', strtolower($week->getContent()));
        $this->assertSame(2, $week->json('meta.total'));

        $month = $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=month&date=2026-10-15')->assertOk()->json('data');
        $this->assertSame('2026-10-01', $month['period']['from']);
        $this->assertSame('2026-10-31', $month['period']['to']);
        $this->assertSame('2026-09-01', $month['period']['previous_date']);
        $this->assertSame('2026-11-01', $month['period']['next_date']);
        $this->assertCount(31, $month['daily']);
        $this->assertSame(['tickets' => 1, 'adults' => 1, 'children' => 1, 'revenue' => '75.00'], $month['totals']);
        $this->assertSame('Octubre de 2026', $month['period']['label']);

        $custom = $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=custom&from=2026-11-01&to=2026-11-03')->assertOk()->json('data');
        $this->assertSame(2, $custom['totals']['tickets']);
        $this->assertSame('450.00', $custom['totals']['revenue']);
        $this->assertNull($custom['period']['previous_date']);
        $this->assertNull($custom['period']['next_date']);
    }

    /** CA-21 */
    public function test_ca21_administration_management_rejects_invalid_custom_ranges(): void
    {
        $admin = $this->createAccount('admin');
        $this->travelTo(Carbon::parse('2026-11-05 12:00:00', 'UTC'));

        $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=custom&from=2025-01-01&to=2026-01-02')
            ->assertUnprocessable()->assertJsonPath('message', 'El rango no puede exceder 366 días.');
        $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=custom&from=2026-11-03&to=2026-11-01')
            ->assertUnprocessable()->assertJsonPath('message', 'La fecha final no puede ser anterior a la fecha inicial.');
        $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=custom&from=2026-11-03')
            ->assertUnprocessable()->assertJsonPath('message', 'Indica la fecha inicial y la fecha final del rango.');
        $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=custom&to=2026-11-03')->assertUnprocessable();
        $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=year')->assertUnprocessable()->assertJsonValidationErrors('period');
        $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=week&date=2026-02-30')->assertUnprocessable()->assertJsonValidationErrors('date');

        $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=custom&from=2025-11-01&to=2026-11-01')->assertOk();
    }
}
