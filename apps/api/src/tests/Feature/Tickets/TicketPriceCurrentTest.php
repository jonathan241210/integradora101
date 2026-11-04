<?php

namespace Tests\Feature\Tickets;

use Illuminate\Support\Facades\DB;

class TicketPriceCurrentTest extends TicketFeatureTestCase
{
    public function test_ca17_ticket_sales_current_prices_include_next_scheduled_change_per_type(): void
    {
        $admin = $this->createAccount('admin');
        $this->setPrices($admin, '25.00', '16.00', '2026-01-01 00:00:00');
        $this->addPrice($admin, 'adult', '28.00', '2026-11-10 12:00:00');
        $this->addPrice($admin, 'adult', '30.00', '2026-12-10 12:00:00');
        $this->travelTo($this->at('2026-11-02 12:00:00'));

        $data = $this->actAs($admin)->getJson('/api/v1/admin/ticket-prices/current')->assertOk()->json('data');

        $this->assertSame('25.00', $data['adult']['amount']);
        $this->assertSame('2026-01-01T00:00:00Z', $data['adult']['effective_at']);
        $this->assertSame(['amount' => '28.00', 'effective_at' => '2026-11-10T12:00:00Z'], $data['adult']['next']);
        $this->assertSame('16.00', $data['child']['amount']);
        $this->assertNull($data['child']['next']);
        $this->assertNull($data['adult']['message']);
    }

    public function test_ca17_ticket_sales_current_prices_report_missing_type_and_enforce_read_permissions(): void
    {
        $admin = $this->createAccount('admin');
        $this->setPrices($admin);
        DB::table('ticket_prices')->where('ticket_type', 'child')->delete();

        $data = $this->actAs($admin)->getJson('/api/v1/admin/ticket-prices/current')->assertOk()->json('data');
        $this->assertNull($data['child']['amount']);
        $this->assertNull($data['child']['effective_at']);
        $this->assertSame('No hay un precio vigente configurado para este tipo de boleto.', $data['child']['message']);

        $this->actAs($this->createAccount('cashier', false))->getJson('/api/v1/admin/ticket-prices/current')->assertOk();
        foreach (['zoo-admin', 'executive', 'veterinarian'] as $role) {
            $this->actAs($this->createAccount($role))->getJson('/api/v1/admin/ticket-prices/current')->assertForbidden();
        }
    }
}
