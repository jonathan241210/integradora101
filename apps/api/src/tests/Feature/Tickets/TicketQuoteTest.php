<?php

namespace Tests\Feature\Tickets;

class TicketQuoteTest extends TicketFeatureTestCase
{
    public function test_ca46_ticket_sales_quote_matches_real_sale(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier, '25.00', '16.00');
        $payload = ['adult_quantity' => 2, 'child_quantity' => 1];

        $quote = $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', $payload)
            ->assertStatus(200)
            ->assertExactJson(['data' => [
                'adult_unit_price' => '25.00',
                'child_unit_price' => '16.00',
                'adult_subtotal' => '50.00',
                'child_subtotal' => '16.00',
                'total_amount' => '66.00',
            ]])->json('data');

        $sale = $this->actAs($cashier)->postJson('/api/v1/admin/tickets', $payload)->assertCreated()->json('data');

        $this->assertSame($quote['total_amount'], $sale['total_amount']);
        $this->assertSame($quote['adult_unit_price'], $sale['tickets'][0]['unit_price']);
        $this->assertSame($quote['child_unit_price'], $sale['tickets'][2]['unit_price']);
        $this->assertCount(3, $sale['tickets']);
        $this->assertArrayNotHasKey('qr_svg', $quote);
        $this->assertArrayNotHasKey('qr_code', $quote);
    }

    public function test_ca46_ticket_sales_quote_uses_cents_without_float(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier, '0.10', '0.20');

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 3, 'child_quantity' => 3])
            ->assertStatus(200)
            ->assertJsonPath('data.adult_subtotal', '0.30')
            ->assertJsonPath('data.child_subtotal', '0.60')
            ->assertJsonPath('data.total_amount', '0.90');
    }

    public function test_ca46_ticket_sales_quote_with_zero_quantity_in_one_type(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 0, 'child_quantity' => 2])
            ->assertStatus(200)
            ->assertJsonPath('data.adult_subtotal', '0.00')
            ->assertJsonPath('data.child_subtotal', '32.00')
            ->assertJsonPath('data.total_amount', '32.00');
    }
}
