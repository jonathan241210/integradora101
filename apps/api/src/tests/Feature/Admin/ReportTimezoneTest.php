<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\CreatesAdminFixtures;

class ReportTimezoneTest extends AdminFeatureTestCase
{
    use CreatesAdminFixtures;

    private const WEEK = '/api/v1/admin/reports/tickets?period=week&date=2026-11-04';

    private const EXPORT = '/api/v1/admin/reports/tickets/export?period=week&date=2026-11-04&format=csv';

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function seedNearMidnight(): void
    {
        $this->travelTo(Carbon::parse('2026-11-08 18:00:00', 'UTC'));
        $this->clearTickets('2026-10-25 00:00:00', '2026-11-20 00:00:00');
        $this->insertTicket('2026-11-01 20:00:00', 1, 0, '50.00');  // Mexico 1 nov 14:00; Tokio 2 nov 05:00
        $this->insertTicket('2026-11-09 03:00:00', 2, 1, '120.50'); // Mexico 8 nov 21:00; Tokio 9 nov 12:00
        $this->insertTicket('2026-11-08 17:00:00', 1, 1, '80.00');  // Mexico 8 nov 11:00; Tokio 9 nov 02:00
    }

    /** CA-28 */
    public function test_ca28_administration_management_dashboard_uses_the_device_timezone(): void
    {
        $admin = $this->createAccount('admin');
        $this->seedNearMidnight();
        $this->insertTicket('2026-11-08 12:00:00', 1, 0, '10.00'); // Mexico 8 nov 06:00; Tokio 8 nov 21:00

        $default = $this->actAs($admin)->getJson('/api/v1/admin/dashboard')->assertOk()->json('data');
        $tokyo = $this->actAs($admin)->getJson('/api/v1/admin/dashboard?timezone=Asia/Tokyo')->assertOk()->json('data');

        $this->assertSame('America/Mexico_City', $default['timezone']);
        $this->assertSame('2026-11-08', $default['series'][6]['date']);
        $this->assertSame(['tickets' => 3, 'adults' => 4, 'children' => 2, 'revenue' => '210.50'], $default['today']);

        $this->assertSame('Asia/Tokyo', $tokyo['timezone']);
        $this->assertSame('2026-11-09', $tokyo['series'][6]['date']);
        $this->assertSame('200.50', $tokyo['series'][6]['revenue']);
        $this->assertSame(['tickets' => 2, 'adults' => 3, 'children' => 2, 'revenue' => '200.50'], $tokyo['today']);
        $this->assertSame('2026-11-03', $tokyo['series'][0]['date']);
    }

    /** CA-28 */
    public function test_ca28_administration_management_report_periods_grouping_and_hours_use_the_device_timezone(): void
    {
        $admin = $this->createAccount('admin');
        $this->seedNearMidnight();

        $mx = $this->actAs($admin)->getJson(self::WEEK)->assertOk()->json('data');
        $this->assertSame('America/Mexico_City', $mx['period']['timezone']);
        $this->assertSame('2026-11-02', $mx['period']['from']);
        $this->assertNull($mx['period']['next_date']);
        $this->assertSame(2, $mx['totals']['tickets']);
        $this->assertSame('200.50', $mx['totals']['revenue']);
        $this->assertSame('2026-11-08 21:00:00', end($mx['tickets'])['purchased_at']);

        $tk = $this->actAs($admin)->getJson(self::WEEK.'&timezone=Asia/Tokyo')->assertOk()->json('data');
        $this->assertSame('Asia/Tokyo', $tk['period']['timezone']);
        $this->assertSame('2026-11-02', $tk['period']['from']);
        $this->assertSame('2026-11-08', $tk['period']['to']);
        $this->assertSame('2026-11-09', $tk['period']['next_date']);
        $this->assertSame('2026-10-26', $tk['period']['previous_date']);
        $this->assertSame(1, $tk['totals']['tickets']);
        $this->assertSame('50.00', $tk['totals']['revenue']);
        $this->assertSame('2026-11-02', $tk['daily'][0]['date']);
        $this->assertSame(1, $tk['daily'][0]['tickets']);
        $this->assertSame('2026-11-02 05:00:00', $tk['tickets'][0]['purchased_at']);
    }

    /** CA-28 */
    public function test_ca28_administration_management_missing_or_invalid_timezone_falls_back_without_422(): void
    {
        $admin = $this->createAccount('admin');
        $this->seedNearMidnight();

        foreach (['', 'Mars/Olympus', 'EST', '+05:00', 'Nope'] as $value) {
            $query = 'timezone='.urlencode($value);
            $this->actAs($admin)->getJson("/api/v1/admin/dashboard?{$query}")
                ->assertOk()->assertJsonPath('data.timezone', 'America/Mexico_City');
            $this->actAs($admin)->getJson(self::WEEK."&{$query}")
                ->assertOk()->assertJsonPath('data.period.timezone', 'America/Mexico_City')
                ->assertJsonPath('data.totals.tickets', 2);
            $csv = $this->actAs($admin)->get(self::EXPORT."&{$query}")->assertOk()->streamedContent();
            $this->assertStringContainsString("\r\n\"Zona horaria\",America/Mexico_City\r\n", $csv);
        }

        $this->actAs($admin)->getJson(self::WEEK.'&timezone[]=Asia/Tokyo')
            ->assertOk()->assertJsonPath('data.period.timezone', 'America/Mexico_City');
    }

    /** CA-28 */
    public function test_ca28_administration_management_csv_matches_the_json_in_a_non_default_timezone(): void
    {
        $admin = $this->createAccount('admin');
        $this->seedNearMidnight();

        $json = $this->actAs($admin)->getJson(self::WEEK.'&timezone=Asia/Tokyo')->assertOk()->json('data');
        $csv = $this->actAs($admin)->get(self::EXPORT.'&timezone=Asia/Tokyo')->assertOk()->streamedContent();

        $this->assertStringContainsString("\r\n\"Zona horaria\",Asia/Tokyo\r\n", $csv);
        $totals = $json['totals'];
        $this->assertStringContainsString("{$totals['tickets']},{$totals['adults']},{$totals['children']},{$totals['revenue']}\r\n", $csv);
        $this->assertStringContainsString('2026-11-02,1,1,0,50.00', $csv);
        foreach ($json['tickets'] as $ticket) {
            $this->assertStringContainsString("{$ticket['folio']},\"{$ticket['purchased_at']}\",{$ticket['adults']},{$ticket['children']},{$ticket['total']}", $csv);
        }
        $this->assertStringNotContainsString('2026-11-09 12:00:00', $csv);
    }

    /** CA-28 */
    public function test_ca28_administration_management_accepts_browser_aliases_and_logs_the_export_timezone(): void
    {
        $admin = $this->createAccount('admin');
        $this->seedNearMidnight();

        $this->actAs($admin)->getJson('/api/v1/admin/dashboard?timezone=Asia/Calcutta')
            ->assertOk()->assertJsonPath('data.timezone', 'Asia/Calcutta');
        $this->actAs($admin)->getJson(self::WEEK.'&timezone=UTC')
            ->assertOk()->assertJsonPath('data.period.timezone', 'UTC');

        $this->actAs($admin)->get(self::EXPORT.'&timezone=Europe/Kiev')->assertOk()->streamedContent();
        $log = Activity::query()->where('event', 'report-exported')->latest('id')->first();
        $this->assertSame('Europe/Kiev', $log->properties['timezone']);
    }

    /** CA-28 */
    public function test_ca28_administration_management_keeps_the_last_day_when_midnight_does_not_exist(): void
    {
        $admin = $this->createAccount('admin');
        // Santiago: el 6 sep 2026 a las 00:00 el reloj salta a 01:00 (UTC-4 -> UTC-3).
        $this->travelTo(Carbon::parse('2026-09-30 12:00:00', 'UTC'));
        $this->clearTickets('2026-08-25 00:00:00', '2026-10-10 00:00:00');
        $this->insertTicket('2026-09-06 03:30:00', 1, 0, '10.00'); // 5 sep 23:30 (UTC-4)
        $this->insertTicket('2026-09-06 04:30:00', 2, 0, '20.00'); // 6 sep 01:30 (UTC-3)
        $this->insertTicket('2026-10-01 02:30:00', 1, 1, '30.00'); // 30 sep 23:30 (UTC-3)

        $url = '/api/v1/admin/reports/tickets?period=month&date=2026-09-15&timezone=America/Santiago';
        $json = $this->actAs($admin)->getJson($url)->assertOk()->json('data');
        $days = array_column($json['daily'], 'date');
        $this->assertCount(30, $days);
        $this->assertContains('2026-09-06', $days);
        $this->assertSame('2026-09-30', end($days));
        $this->assertSame('30.00', end($json['daily'])['revenue']);
        $this->assertSame(3, $json['totals']['tickets']);
        $this->assertSame('60.00', $json['totals']['revenue']);
        $this->assertCount(3, $json['tickets']);
        $this->assertSame('2026-09-06 01:30:00', $json['tickets'][1]['purchased_at']);

        $csv = $this->actAs($admin)->get('/api/v1/admin/reports/tickets/export?period=month&date=2026-09-15&format=csv&timezone=America/Santiago')
            ->assertOk()->streamedContent();
        $this->assertStringContainsString('3,4,1,60.00'."\r\n", $csv);
        $this->assertStringContainsString('2026-09-30,1,1,1,30.00', $csv);
        foreach ($json['tickets'] as $ticket) {
            $this->assertStringContainsString("{$ticket['folio']},\"{$ticket['purchased_at']}\"", $csv);
        }

        // Panel: hoy es el 7 sep (Santiago) y la ventana de 7 días cruza el cambio.
        $this->travelTo(Carbon::parse('2026-09-07 15:00:00', 'UTC'));
        $dash = $this->actAs($admin)->getJson('/api/v1/admin/dashboard?timezone=America/Santiago')->assertOk()->json('data');
        $this->assertCount(7, $dash['series']);
        $this->assertSame('2026-09-01', $dash['series'][0]['date']);
        $this->assertSame('2026-09-07', $dash['series'][6]['date']);
        $this->assertSame('20.00', $dash['series'][5]['revenue']);
        $this->assertSame('10.00', $dash['series'][4]['revenue']);
        $this->assertSame(0, $dash['today']['tickets']);
        $this->assertSame(2, $dash['last_7_days']['tickets']);
    }

    /** CA-28 */
    public function test_ca28_administration_management_custom_range_of_max_days_ending_on_a_time_change_is_not_rejected(): void
    {
        $admin = $this->createAccount('admin');
        $this->travelTo(Carbon::parse('2026-11-08 18:00:00', 'UTC'));

        // 366 días de calendario terminando el 6 sep 2026 (cambio de hora en Santiago).
        $ok = '/api/v1/admin/reports/tickets?period=custom&from=2025-09-06&to=2026-09-06&timezone=America/Santiago';
        $this->actAs($admin)->getJson($ok)->assertOk()->assertJsonCount(366, 'data.daily');

        $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=custom&from=2025-09-05&to=2026-09-06&timezone=America/Santiago')
            ->assertUnprocessable();
    }
}
