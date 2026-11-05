<?php

namespace Tests\Feature\Tickets;

use Illuminate\Support\Facades\DB;

class TicketPriceResolutionTest extends TicketFeatureTestCase
{
    public function test_ca04_ticket_sales_rejects_a_sale_without_current_price(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        DB::table('ticket_prices')->where('ticket_type', 'child')->delete();
        $tickets = $this->ticketCount();

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 0])
            ->assertStatus(422)
            ->assertJsonPath('message', 'No hay un precio vigente configurado para este tipo de boleto.');

        // Un precio solo futuro tampoco es vigente.
        $this->addPrice($cashier, 'child', '16.00', now()->addDay()->format('Y-m-d H:i:s'));
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 0])
            ->assertStatus(422)
            ->assertJsonPath('message', 'No hay un precio vigente configurado para este tipo de boleto.');

        $this->assertSame($tickets, $this->ticketCount());
    }

    public function test_ca05_ticket_sales_uses_old_price_before_and_new_price_after_scheduled_change(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier, '25.00', '16.00');
        $this->addPrice($cashier, 'adult', '30.00', '2026-12-01 12:00:00');
        $this->addPrice($cashier, 'child', '20.00', '2026-12-01 12:00:00');

        $this->travelTo($this->at('2026-12-01 11:59:59'));
        $before = $this->sell($cashier, 1, 1);
        $this->assertSame('41.00', $before['total_amount']);

        $this->travelTo($this->at('2026-12-01 12:00:00'));
        $after = $this->sell($cashier, 1, 1);
        $this->assertSame('50.00', $after['total_amount']);
    }
}
