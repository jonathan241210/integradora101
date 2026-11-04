<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;

class CancelTicketValidationTest extends TicketFeatureTestCase
{
    public function test_ca11_ticket_sales_requires_a_non_empty_reason_in_spanish(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $sale = $this->sell($cashier);
        $url = "/api/v1/admin/tickets/{$sale['folio']}/cancel";

        foreach ([[], ['reason' => ''], ['reason' => '   '], ['reason' => null]] as $payload) {
            $this->actAs($cashier)->postJson($url, $payload)
                ->assertStatus(422)
                ->assertJsonValidationErrors(['reason'], 'errors')
                ->assertJsonPath('message', 'Indica el motivo de la cancelación.');
        }

        $ticket = Ticket::query()->findOrFail($sale['folio']);
        $this->assertSame('completed', $ticket->status);
        $this->assertNull($ticket->cancelled_at);
        $this->assertNull($ticket->cancellation_reason);
    }
}
