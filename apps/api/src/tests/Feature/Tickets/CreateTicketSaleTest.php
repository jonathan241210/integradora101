<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;

class CreateTicketSaleTest extends TicketFeatureTestCase
{
    public function test_ca01_ticket_sales_cashier_registers_a_cash_sale_with_current_prices(): void
    {
        $cashier = $this->createAccount('cashier', false, ['first_name' => 'Caja', 'last_name' => 'Uno']);
        $this->setPrices($cashier, '25.00', '16.00');

        $data = $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 2, 'child_quantity' => 1])
            ->assertCreated()
            ->assertJsonStructure(['data' => ['folio', 'purchased_at', 'adult_quantity', 'child_quantity', 'total_amount', 'cashier_name', 'qr_svg']])
            ->json('data');

        $ticket = Ticket::query()->findOrFail($data['folio']);
        $this->assertSame('completed', $ticket->status);
        $this->assertSame('cash', $ticket->payment_method);
        $this->assertSame($cashier->id, (int) $ticket->cashier_id);
        $this->assertSame('25.00', $ticket->adult_unit_price);
        $this->assertSame('16.00', $ticket->child_unit_price);
        $this->assertSame(2, $ticket->adult_quantity);
        $this->assertSame(1, $ticket->child_quantity);
        $this->assertMatchesRegularExpression('/Z$/', $data['purchased_at']);
        $this->assertStringContainsString('Caja Uno', $data['cashier_name']);
        $this->assertArrayNotHasKey('qr_code', $data);
    }
}
