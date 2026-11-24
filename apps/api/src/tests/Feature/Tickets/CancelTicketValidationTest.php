<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;

class CancelTicketValidationTest extends TicketFeatureTestCase
{
    public function test_ca11_ticket_sales_requires_a_reason_code_in_spanish(): void
    {
        $cashier = $this->createAccount('cashier');
        $this->setPrices($cashier);
        $sale = $this->sell($cashier);
        $url = "/api/v1/admin/tickets/{$sale['folio']}/cancel";

        // api-022 cambia el contrato: el motivo es un código del catálogo; el texto libre solo no basta.
        foreach ([[], ['reason' => 'Error de captura'], ['reason_code' => '']] as $payload) {
            $this->actAs($cashier)->postJson($url, $payload)
                ->assertStatus(422)
                ->assertJsonValidationErrors(['reason_code'], 'errors')
                ->assertJsonPath('message', 'Selecciona un motivo de cancelación.');
        }

        $ticket = Ticket::query()->findOrFail($sale['folio']);
        $this->assertSame('completed', $ticket->status);
        $this->assertNull($ticket->cancelled_at);
        $this->assertNull($ticket->cancellation_reason);
    }
}
