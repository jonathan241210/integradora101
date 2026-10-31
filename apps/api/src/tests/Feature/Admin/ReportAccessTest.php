<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Carbon;
use Tests\Concerns\CreatesAdminFixtures;

class ReportAccessTest extends AdminFeatureTestCase
{
    use CreatesAdminFixtures;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** CA-24 */
    public function test_ca24_administration_management_gives_read_only_panel_and_report_to_each_role(): void
    {
        $accounts = [
            'executive' => $this->createAccount('executive'),
            'admin' => $this->createAccount('admin'),
            'zoo-admin' => $this->createAccount('zoo-admin'),
        ];
        $this->travelTo(Carbon::parse('2026-11-05 12:00:00', 'UTC'));
        $this->clearTickets('2026-10-25 00:00:00', '2026-12-05 00:00:00');
        $this->insertTicket('2026-11-03 18:00:00', 2, 1, '150.00');

        $reports = [];
        $dashboards = [];
        foreach ($accounts as $role => $account) {
            $reports[$role] = $this->actAs($account)->getJson('/api/v1/admin/reports/tickets?period=week&date=2026-11-04')->assertOk()->json();
            $dashboards[$role] = $this->actAs($account)->getJson('/api/v1/admin/dashboard')->assertOk()->json();
            $this->actAs($account)->getJson('/api/v1/admin/reports/tickets/export?period=week&date=2026-11-04&format=csv')->assertOk();
        }

        $this->assertSame($reports['admin'], $reports['executive']);
        $this->assertSame($reports['admin'], $reports['zoo-admin']);
        $this->assertSame($dashboards['admin'], $dashboards['executive']);
        $this->assertSame($dashboards['admin'], $dashboards['zoo-admin']);
        $this->assertSame('150.00', $reports['admin']['data']['totals']['revenue']);

        foreach (['cashier', 'veterinarian'] as $role) {
            $user = $this->createAccount($role);
            $this->actAs($user)->getJson('/api/v1/admin/dashboard')->assertForbidden();
            $this->actAs($user)->getJson('/api/v1/admin/reports/tickets?period=week')->assertForbidden();
            $this->actAs($user)->getJson('/api/v1/admin/reports/tickets/export?period=week&format=csv')->assertForbidden();
        }

        $this->actAs($accounts['executive'])->postJson('/api/v1/admin/enclosures', ['name' => 'No permitido'])->assertForbidden();
    }
}
