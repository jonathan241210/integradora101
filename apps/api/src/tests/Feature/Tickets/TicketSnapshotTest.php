<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;

class TicketSnapshotTest extends TicketFeatureTestCase
{
    public function test_ca27_ticket_sales_sold_ticket_keeps_its_prices_after_a_price_change(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($admin, '25.00', '16.00');
        $sale = $this->sell($cashier, 2, 1);

        $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
            'adult_amount' => 99, 'child_amount' => 88, 'mode' => 'immediate',
        ])->assertCreated();

        $ticket = Ticket::query()->findOrFail($sale['folio']);
        $this->assertSame('66.00', $ticket->total_amount);
        $this->assertSame('25.00', $ticket->adult_unit_price);
        $this->assertSame('16.00', $ticket->child_unit_price);
        $this->assertSame('66.00', $this->actAs($cashier)->getJson("/api/v1/admin/tickets?folio={$sale['folio']}")->json('data.0.total_amount'));
    }
}
