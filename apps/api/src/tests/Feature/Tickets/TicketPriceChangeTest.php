<?php

namespace Tests\Feature\Tickets;

use App\Models\TicketPrice;

class TicketPriceChangeTest extends TicketFeatureTestCase
{
    public function test_ca18_ticket_sales_immediate_change_applies_from_the_response(): void
    {
        $admin = $this->createAccount('admin');
        $this->setPrices($admin, '25.00', '16.00');
        $this->travelTo($this->at('2026-11-02 12:00:00'));
        $before = TicketPrice::query()->count();

        $data = $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
            'adult_amount' => 27.5, 'child_amount' => '18.00', 'mode' => 'immediate',
        ])->assertCreated()->json('data');

        $this->assertCount(2, $data['prices']);
        $this->assertSame('2026-11-02T12:00:00Z', $data['prices'][0]['effective_at']);
        $this->assertSame('27.50', $data['current']['adult']['amount']);
        $this->assertSame('18.00', $data['current']['child']['amount']);
        $this->assertSame($before + 2, TicketPrice::query()->count());
        $this->assertSame(2, TicketPrice::query()->where('created_by', $admin->id)->where('effective_at', '2026-11-02 12:00:00')->count());
        $this->assertSame(2, TicketPrice::query()->where('amount', '25.00')->orWhere('amount', '16.00')->count(), 'Las filas previas no se modifican.');

        $this->actAs($admin)->getJson('/api/v1/admin/ticket-prices/current')->assertJsonPath('data.adult.amount', '27.50');
    }

    public function test_ca19_ticket_sales_scheduled_change_takes_effect_at_the_given_time(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($admin, '25.00', '16.00');
        $this->travelTo($this->at('2026-11-02 12:00:00'));

        $data = $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
            'adult_amount' => 30, 'child_amount' => 20, 'mode' => 'scheduled', 'effective_at' => '2026-12-01T06:00:00-06:00',
        ])->assertCreated()->json('data');

        $this->assertSame('2026-12-01T12:00:00Z', $data['prices'][0]['effective_at']);
        $this->assertSame('25.00', $data['current']['adult']['amount']);
        $this->assertSame('30.00', $data['current']['adult']['next']['amount']);

        $this->travelTo($this->at('2026-12-01 11:59:59'));
        $this->assertSame('25.00', $this->actAs($cashier)->getJson('/api/v1/admin/ticket-prices/current')->json('data.adult.amount'));
        $this->assertSame('41.00', $this->sellPurchase($cashier, 1, 1)['total_amount']);

        $this->travelTo($this->at('2026-12-01 12:00:00'));
        $this->assertSame('30.00', $this->actAs($cashier)->getJson('/api/v1/admin/ticket-prices/current')->json('data.adult.amount'));
        $this->assertSame('50.00', $this->sellPurchase($cashier, 1, 1)['total_amount']);
    }
}
