<?php

namespace Tests\Feature\Tickets;

use App\Models\TicketPrice;

class TicketPriceHorizonTest extends TicketFeatureTestCase
{
    private const MESSAGE = 'La fecha de entrada en vigor no puede ser mayor a un año a partir de hoy.';

    public function test_ca45_ticket_prices_effective_at_at_most_one_year(): void
    {
        $admin = $this->createAccount('admin');
        $this->setPrices($admin);
        $this->travelTo($this->at('2026-11-02 12:00:00'));
        $rows = TicketPrice::query()->count();

        foreach (['2027-11-02T12:00:01Z', '2027-11-02T06:00:01-06:00', '2030-01-01T00:00:00Z'] as $far) {
            $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
                'adult_amount' => 30, 'child_amount' => 20, 'mode' => 'scheduled', 'effective_at' => $far,
            ])->assertStatus(422)
                ->assertJsonValidationErrors(['effective_at'], 'errors')
                ->assertJsonPath('errors.effective_at.0', self::MESSAGE);
        }
        $this->assertSame($rows, TicketPrice::query()->count());

        $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
            'adult_amount' => 30, 'child_amount' => 20, 'mode' => 'scheduled', 'effective_at' => '2027-06-01T09:00:00-06:00',
        ])->assertCreated();
        $this->assertSame($rows + 2, TicketPrice::query()->count());
    }

    public function test_ca45_ticket_prices_the_limit_does_not_apply_to_immediate_changes(): void
    {
        $admin = $this->createAccount('admin');
        $this->setPrices($admin);

        $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
            'adult_amount' => 30, 'child_amount' => 20, 'mode' => 'immediate',
        ])->assertCreated();
    }
}
