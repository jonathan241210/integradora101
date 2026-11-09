<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;

class TicketCancelLimitsTest extends TicketFeatureTestCase
{
    public function test_ca44_ticket_cancel_limit_of_20_per_minute(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $first = $this->sell($cashier)['folio'];
        $last = $this->sell($cashier)['folio'];

        $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$first}/cancel", ['reason' => 'Primera'])->assertOk();
        // 19 solicitudes más (404 por folio inexistente) completan las 20 del minuto.
        for ($i = 0; $i < 19; $i++) {
            $this->actAs($cashier)->postJson('/api/v1/admin/tickets/999999999/cancel', ['reason' => 'X'])->assertNotFound();
        }

        $response = $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$last}/cancel", ['reason' => 'Excede'])
            ->assertStatus(429);
        $this->assertMatchesRegularExpression('/^Demasiados intentos\. Intenta de nuevo en \d+ segundos\.$/', $response->json('message'));
        $this->assertSame('completed', Ticket::query()->findOrFail($last)->status);
        $this->assertNull(Ticket::query()->findOrFail($last)->cancelled_at);

        // Tras el minuto, la cuota se renueva.
        $this->travel(61)->seconds();
        $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$last}/cancel", ['reason' => 'Ya'])->assertOk();
    }

    public function test_ca44_ticket_cancel_a_403_does_not_consume_quota(): void
    {
        $admin = $this->createAccount('admin');
        for ($i = 0; $i < 25; $i++) {
            $this->actAs($admin)->postJson('/api/v1/admin/tickets/1/cancel', ['reason' => 'X'])->assertForbidden();
        }
    }
}
