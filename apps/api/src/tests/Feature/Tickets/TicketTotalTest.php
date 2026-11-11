<?php

namespace Tests\Feature\Tickets;

use App\Actions\Admin\Tickets\CalculateTicketTotalAction;

class TicketTotalTest extends TicketFeatureTestCase
{
    public function test_ca02_ticket_sales_total_is_computed_in_cents_with_mixed_quantities(): void
    {
        $this->assertSame('66.00', (new CalculateTicketTotalAction)->execute(2, '25.00', 1, '16.00'));
        $this->assertSame('0.30', (new CalculateTicketTotalAction)->execute(1, '0.10', 1, '0.20'));
        $this->assertSame('1.05', (new CalculateTicketTotalAction)->execute(0, '9.99', 3, '0.35'));
    }

    public function test_ca02_ticket_sales_total_in_response_matches_server_calculation(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier, '25.00', '16.00');

        $data = $this->actAs($cashier)->postJson('/api/v1/admin/tickets', [
            'adult_quantity' => 2, 'child_quantity' => 1, 'total_amount' => '1.00',
        ])->assertCreated()->json('data');

        $this->assertSame('66.00', $data['total_amount']);
        $this->assertSame(66.0, array_sum(array_map('floatval', array_column($data['tickets'], 'total_amount'))));
    }
}
