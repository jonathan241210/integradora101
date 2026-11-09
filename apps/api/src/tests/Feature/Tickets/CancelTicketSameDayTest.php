<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;

class CancelTicketSameDayTest extends TicketFeatureTestCase
{
    private const MESSAGE = 'Solo se pueden cancelar boletos el mismo día en que se vendieron.';

    public function test_ca31_ticket_sales_rejects_a_ticket_from_a_previous_day_in_the_zoo_zone(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        // 2026-11-02 03:00 UTC es 2026-11-01 21:00 en Ciudad de México.
        $id = $this->insertSale($cashier, '2026-11-02 03:00:00');

        $this->travelTo($this->at('2026-11-02 18:00:00')); // 2026-11-02 12:00 en Ciudad de México
        $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$id}/cancel", ['reason' => 'Tarde'])
            ->assertStatus(422)
            ->assertJsonPath('message', self::MESSAGE);

        $this->assertSame('completed', Ticket::query()->findOrFail($id)->status);
        $this->assertNull(Ticket::query()->findOrFail($id)->cancelled_at);
    }

    public function test_ca31_ticket_sales_cancels_a_ticket_sold_earlier_the_same_day(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $id = $this->insertSale($cashier, '2026-11-02 15:00:00');
        $this->travelTo($this->at('2026-11-02 20:00:00'));

        $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$id}/cancel", ['reason' => 'Mismo día'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_ca31_ticket_sales_body_timezone_is_ignored(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);

        // Venta a las 09:00 del día D en Ciudad de México; cancelación a las 23:50 de D (D+1 en Madrid y en UTC).
        $sameDay = $this->insertSale($cashier, '2026-11-02 15:00:00');
        $this->travelTo($this->at('2026-11-03 05:50:00'));
        foreach (['Europe/Madrid', 'UTC', 'EST', 'no-es-zona', 123, ['x']] as $zone) {
            $id = $this->insertSale($cashier, '2026-11-02 15:00:00');
            $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$id}/cancel", ['reason' => 'Zona', 'timezone' => $zone])
                ->assertOk()
                ->assertJsonPath('data.status', 'cancelled');
        }
        $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$sameDay}/cancel", ['reason' => 'Sin zona'])->assertOk();

        // Boleto del día D-1 en Ciudad de México (D en UTC y en Madrid): sigue siendo 422 con cualquier zona.
        $this->travelTo($this->at('2026-11-02 18:00:00'));
        foreach (['Europe/Madrid', 'UTC', 'America/Mexico_City'] as $zone) {
            $id = $this->insertSale($cashier, '2026-11-02 03:00:00');
            $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$id}/cancel", ['reason' => 'Zona', 'timezone' => $zone])
                ->assertStatus(422)
                ->assertJsonPath('message', self::MESSAGE);
            $this->assertSame('completed', Ticket::query()->findOrFail($id)->status);
        }
    }
}
