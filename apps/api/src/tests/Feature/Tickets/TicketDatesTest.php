<?php

namespace Tests\Feature\Tickets;

class TicketDatesTest extends TicketFeatureTestCase
{
    public function test_ca29_ticket_sales_dates_are_utc_iso_8601_and_invalid_timezone_is_not_an_error(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $this->setPrices($admin);
        $this->travelTo($this->at('2026-11-02 18:30:15'));

        $sale = $this->sell($cashier);
        $this->assertSame('2026-11-02T18:30:15Z', $sale['purchased_at']);

        $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$sale['folio']}/cancel", ['reason_code' => 'capture_error', 'reason' => 'Fechas', 'timezone' => 'no-es-zona'])
            ->assertOk()
            ->assertJsonPath('data.purchased_at', '2026-11-02T18:30:15Z')
            ->assertJsonPath('data.cancelled_at', '2026-11-02T18:30:15Z');

        $this->actAs($cashier)->getJson('/api/v1/admin/tickets?timezone=%2B05:00')->assertOk();
        $this->actAs($cashier)->getJson('/api/v1/admin/tickets?timezone=Mars/Olympus')->assertOk();

        $change = $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
            'adult_amount' => 30, 'child_amount' => 20, 'password' => self::STEP_UP_PASSWORD, 'mode' => 'scheduled', 'effective_at' => '2026-12-01T09:00:00+02:00',
        ])->assertCreated()->json('data');
        $this->assertSame('2026-12-01T07:00:00Z', $change['prices'][0]['effective_at']);
        $this->assertSame('2026-12-01T07:00:00Z', $change['current']['adult']['next']['effective_at']);
    }

    /** CA-10 single-business-timezone */
    public function test_ca10_invalid_timezone_is_not_an_error(): void
    {
        $cashier = $this->createAccount('cashier');
        $this->setPrices($this->createAccount('admin'));
        $this->travelTo($this->at('2026-11-07 05:30:00'));

        $baseline = $this->actAs($cashier)->getJson('/api/v1/admin/tickets')->assertOk()->json();
        foreach (['Asia/Tokyo', 'Mars/Olympus', 'EST', '+05:00'] as $zone) {
            $this->actAs($cashier)->getJson('/api/v1/admin/tickets?timezone='.urlencode($zone))
                ->assertOk()
                ->assertJsonPath('timezone', 'America/Mexico_City');
            $this->assertSame($baseline, $this->actAs($cashier)->getJson('/api/v1/admin/tickets?timezone='.urlencode($zone))->json());
        }
    }
}
