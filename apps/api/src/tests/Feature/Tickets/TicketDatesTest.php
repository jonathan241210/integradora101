<?php

namespace Tests\Feature\Tickets;

class TicketDatesTest extends TicketFeatureTestCase
{
    public function test_ca29_ticket_sales_dates_are_utc_iso_8601_and_invalid_timezone_is_not_an_error(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($admin);
        $this->travelTo($this->at('2026-11-02 18:30:15'));

        $sale = $this->sell($cashier);
        $this->assertSame('2026-11-02T18:30:15Z', $sale['purchased_at']);

        $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$sale['folio']}/cancel", ['reason' => 'Fechas', 'timezone' => 'no-es-zona'])
            ->assertOk()
            ->assertJsonPath('data.purchased_at', '2026-11-02T18:30:15Z')
            ->assertJsonPath('data.cancelled_at', '2026-11-02T18:30:15Z');

        $this->actAs($cashier)->getJson('/api/v1/admin/tickets?timezone=%2B05:00')->assertOk();
        $this->actAs($cashier)->getJson('/api/v1/admin/tickets?timezone=Mars/Olympus')->assertOk();

        $change = $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
            'adult_amount' => 30, 'child_amount' => 20, 'mode' => 'scheduled', 'effective_at' => '2026-12-01T09:00:00+02:00',
        ])->assertCreated()->json('data');
        $this->assertSame('2026-12-01T07:00:00Z', $change['prices'][0]['effective_at']);
        $this->assertSame('2026-12-01T07:00:00Z', $change['current']['adult']['next']['effective_at']);
    }
}
