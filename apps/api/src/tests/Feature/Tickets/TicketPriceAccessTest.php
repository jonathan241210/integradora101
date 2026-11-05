<?php

namespace Tests\Feature\Tickets;

use App\Models\TicketPrice;

class TicketPriceAccessTest extends TicketFeatureTestCase
{
    public function test_ca22_ticket_sales_only_admin_with_two_factor_changes_prices(): void
    {
        $admin = $this->createAccount('admin');
        $this->setPrices($admin);
        $rows = TicketPrice::query()->count();
        $payload = ['adult_amount' => 30, 'child_amount' => 20, 'mode' => 'immediate'];

        foreach (['zoo-admin', 'cashier', 'executive', 'veterinarian'] as $role) {
            $this->actAs($this->createAccount($role))->postJson('/api/v1/admin/ticket-prices', $payload)->assertForbidden();
        }

        $this->actAs($this->createAccount('admin', false))->postJson('/api/v1/admin/ticket-prices', $payload)
            ->assertForbidden()
            ->assertJsonPath('code', 'two_factor_setup_required');

        $this->assertSame($rows, TicketPrice::query()->count());
    }
}
