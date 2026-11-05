<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesAdminFixtures;

class DashboardSummaryTest extends AdminFeatureTestCase
{
    use CreatesAdminFixtures;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** CA-19 */
    public function test_ca19_administration_management_keeps_tickets_read_only(): void
    {
        // api-009 reemplaza el bloqueo del modelo: los reportes siguen siendo solo lectura y
        // el boleto solo cambia por las Actions de venta y cancelación.
        $admin = $this->createAccount('admin');
        $id = $this->insertTicket('2026-11-05 07:00:00', 1, 0, '10.00');
        $before = (array) DB::table('tickets')->where('id', $id)->first();

        $this->actAs($admin)->getJson('/api/v1/admin/dashboard')->assertOk();
        $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=week&date=2026-11-05')->assertOk();
        $this->actAs($admin)->get('/api/v1/admin/reports/tickets/export?period=week&date=2026-11-05&format=csv')->assertOk()->streamedContent();
        $this->actAs($admin)->postJson('/api/v1/admin/reports/tickets', ['adult_quantity' => 99])->assertStatus(405);
        $this->actAs($admin)->patchJson("/api/v1/admin/reports/tickets/{$id}", ['adult_quantity' => 99])->assertStatus(404);
        $this->actAs($admin)->deleteJson("/api/v1/admin/tickets/{$id}")->assertNotFound();

        $this->assertSame($before, (array) DB::table('tickets')->where('id', $id)->first());
    }
}
