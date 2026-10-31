<?php

namespace Tests\Feature\Admin;

use App\Models\Ticket;
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
    public function test_ca19_administration_management_summarizes_today_and_seven_days_in_server_timezone(): void
    {
        $admin = $this->createAccount('admin');
        $this->travelTo(Carbon::parse('2026-11-05 12:00:00', 'UTC'));
        $this->clearTickets('2026-10-27 00:00:00', '2026-11-08 00:00:00');

        $empty = $this->actAs($admin)->getJson('/api/v1/admin/dashboard')->assertOk();
        $this->assertSame(0, $empty->json('data.today.tickets'));
        $this->assertSame('0.00', $empty->json('data.today.revenue'));
        $this->assertSame('0.00', $empty->json('data.last_7_days.revenue'));
        $this->assertCount(7, $empty->json('data.series'));

        $this->insertTicket('2026-11-05 07:00:00', 2, 1, '150.50'); // 01:00 local, hoy
        $this->insertTicket('2026-11-05 05:30:00', 1, 0, '100.00'); // 23:30 local del día 4
        $this->insertTicket('2026-10-30 12:00:00', 3, 2, '200.25'); // día 30, dentro de 7 días
        $this->insertTicket('2026-10-29 12:00:00', 9, 9, '999.00'); // fuera de los 7 días

        $data = $this->actAs($admin)->getJson('/api/v1/admin/dashboard')->assertOk()->json('data');

        $this->assertSame(['tickets' => 1, 'adults' => 2, 'children' => 1, 'revenue' => '150.50'], $data['today']);
        $this->assertSame(['tickets' => 3, 'adults' => 6, 'children' => 3, 'revenue' => '450.75'], $data['last_7_days']);
        $this->assertSame('2026-10-30', $data['series'][0]['date']);
        $this->assertSame('200.25', $data['series'][0]['revenue']);
        $this->assertSame(['date' => '2026-11-04', 'revenue' => '100.00'], $data['series'][5]);
        $this->assertSame(['date' => '2026-11-05', 'revenue' => '150.50'], $data['series'][6]);
    }

    /** CA-19 */
    public function test_ca19_administration_management_keeps_tickets_read_only(): void
    {
        $id = $this->insertTicket('2026-11-05 07:00:00', 1, 0, '10.00');
        $ticket = Ticket::query()->findOrFail($id);

        $ticket->adult_quantity = 99;
        try {
            $ticket->save();
            $this->fail('Ticket::save debió lanzar una excepción.');
        } catch (\LogicException) {
            // esperado
        }
        $this->expectException(\LogicException::class);
        try {
            $ticket->delete();
        } finally {
            $this->assertSame(1, (int) DB::table('tickets')->where('id', $id)->value('adult_quantity'));
        }
    }
}
