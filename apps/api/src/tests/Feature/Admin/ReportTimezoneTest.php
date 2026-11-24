<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\CreatesAdminFixtures;

/** Zona única de negocio en panel, reporte y exportación (api-025). */
class ReportTimezoneTest extends AdminFeatureTestCase
{
    use CreatesAdminFixtures;

    private const WEEK = '/api/v1/admin/reports/tickets?period=week&date=2026-11-06';

    private const EXPORT = '/api/v1/admin/reports/tickets/export?period=week&date=2026-11-06&format=csv';

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** Boleto de las 05:30 UTC del 7 (23:30 del 6 en America/Mexico_City). */
    private function seedBoundaryTicket(): void
    {
        $this->travelTo(Carbon::parse('2026-11-07 05:45:00', 'UTC'));
        $this->clearTickets('2026-10-25 00:00:00', '2026-11-20 00:00:00');
        $this->insertTicket('2026-11-07 05:30:00', 1, 0, '50.00');
    }

    /** CA-04 single-business-timezone */
    public function test_ca04_dashboard_counts_in_the_business_timezone(): void
    {
        $admin = $this->createAccount('admin');
        $this->seedBoundaryTicket();

        foreach ([null, 'Europe/Madrid'] as $zone) {
            $url = '/api/v1/admin/dashboard'.($zone ? '?timezone='.$zone : '');
            $data = $this->actAs($admin)->getJson($url)->assertOk()->json('data');
            $this->assertSame('America/Mexico_City', $data['timezone']);
            $this->assertSame('2026-11-06', $data['series'][6]['date']);
            $this->assertSame('50.00', $data['series'][6]['revenue']);
            $this->assertSame(1, $data['today']['tickets']);
        }
    }

    /** CA-12 single-business-timezone */
    public function test_ca12_dashboard_and_report_expose_arca_timezone(): void
    {
        $admin = $this->createAccount('admin');
        $this->seedBoundaryTicket();

        $this->actAs($admin)->getJson('/api/v1/admin/dashboard')->assertOk()->assertJsonPath('data.timezone', 'America/Mexico_City');
        $this->actAs($admin)->getJson(self::WEEK)->assertOk()->assertJsonPath('data.period.timezone', 'America/Mexico_City');

        config(['arca.timezone' => 'UTC']);
        $this->actAs($admin)->getJson('/api/v1/admin/dashboard')->assertOk()->assertJsonPath('data.timezone', 'UTC');
        $this->actAs($admin)->getJson(self::WEEK)->assertOk()->assertJsonPath('data.period.timezone', 'UTC');
    }

    /** CA-05 single-business-timezone */
    public function test_ca05_csv_purchased_at_time_in_business_timezone(): void
    {
        $admin = $this->createAccount('admin');
        $this->seedBoundaryTicket();

        $csv = $this->actAs($admin)->get(self::EXPORT.'&timezone=America/Tijuana')->assertOk()->streamedContent();
        $this->assertStringContainsString("\r\n\"Zona horaria\",America/Mexico_City\r\n", $csv);
        $this->assertStringContainsString('"2026-11-06 23:30:00"', $csv);
        $this->assertStringContainsString('2026-11-06,1,1,0,50.00', $csv);

        $json = $this->actAs($admin)->getJson(self::WEEK.'&timezone=America/Tijuana')->assertOk()->json('data');
        $this->assertSame(1, $json['totals']['tickets']);
        $this->assertSame('2026-11-06 23:30:00', $json['tickets'][0]['purchased_at']);

        $log = Activity::query()->where('event', 'report-exported')->latest('id')->first();
        $this->assertSame('America/Mexico_City', $log->properties['timezone']);
    }

    /** CA-10 single-business-timezone */
    public function test_ca10_client_timezone_does_not_change_dashboard_or_report(): void
    {
        $admin = $this->createAccount('admin');
        $this->seedBoundaryTicket();

        $dash = $this->actAs($admin)->getJson('/api/v1/admin/dashboard')->json();
        $week = $this->actAs($admin)->getJson(self::WEEK)->json();
        foreach (['Asia/Tokyo', 'Mars/Olympus', 'EST', '+05:00'] as $value) {
            $query = 'timezone='.urlencode($value);
            $this->assertSame($dash, $this->actAs($admin)->getJson("/api/v1/admin/dashboard?{$query}")->assertOk()->json());
            $this->assertSame($week, $this->actAs($admin)->getJson(self::WEEK."&{$query}")->assertOk()->json());
            $csv = $this->actAs($admin)->get(self::EXPORT."&{$query}")->assertOk()->streamedContent();
            $this->assertStringContainsString("\r\n\"Zona horaria\",America/Mexico_City\r\n", $csv);
        }
        $this->actAs($admin)->getJson(self::WEEK.'&timezone[]=Asia/Tokyo')->assertOk()->assertJsonPath('data.period.timezone', 'America/Mexico_City');
    }

    /** CA-28 */
    // api-007 CA-28 queda sustituido por api-025 CA-10: la zona del dispositivo ya no se usa; solo la de negocio.
    public function test_ca28_administration_management_device_timezone_is_replaced_by_the_business_timezone(): void
    {
        $admin = $this->createAccount('admin');

        $this->actAs($admin)->getJson(self::WEEK.'&timezone=Asia/Tokyo')
            ->assertOk()
            ->assertJsonPath('data.period.timezone', 'America/Mexico_City');
    }

    /** CA-02 single-business-timezone */
    public function test_ca02_changing_the_timezone_changes_the_cutoff(): void
    {
        $admin = $this->createAccount('admin');
        $this->seedBoundaryTicket();

        $mx = $this->actAs($admin)->getJson(self::WEEK)->assertOk()->json('data');
        $this->assertSame('2026-11-06 23:30:00', $mx['tickets'][0]['purchased_at']);
        $this->assertSame('50.00', collect($mx['daily'])->firstWhere('date', '2026-11-06')['revenue']);

        config(['arca.timezone' => 'UTC']);
        $utc = $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=week&date=2026-11-07')->assertOk()->json('data');
        $this->assertSame('2026-11-07 05:30:00', $utc['tickets'][0]['purchased_at']);
        $this->assertSame('50.00', collect($utc['daily'])->firstWhere('date', '2026-11-07')['revenue']);
        $this->assertSame('0.00', collect($utc['daily'])->firstWhere('date', '2026-11-06')['revenue']);
    }
}
