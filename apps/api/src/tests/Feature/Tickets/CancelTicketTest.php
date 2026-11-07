<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;

class CancelTicketTest extends TicketFeatureTestCase
{
    public function test_ca10_ticket_sales_cashier_cancels_own_ticket_of_the_same_day(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $sale = $this->sell($cashier, 1, 1);

        $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$sale['folio']}/cancel", ['reason' => 'Error de captura'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.cancellation_reason', 'Error de captura')
            ->assertJsonPath('data.cancellable', false);

        $ticket = Ticket::query()->findOrFail($sale['folio']);
        $this->assertSame('cancelled', $ticket->status);
        $this->assertSame($cashier->id, (int) $ticket->cancelled_by);
        $this->assertSame($cashier->id, (int) $ticket->updated_by);
        $this->assertNotNull($ticket->cancelled_at);
        $this->assertSame('Error de captura', $ticket->cancellation_reason);
        $this->assertNull($ticket->deleted_at);
        $this->assertSame('25.00', $ticket->total_amount); // boleto individual de adulto
    }

    public function test_ca12_ticket_sales_rejects_cancelling_twice_without_changing_data(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $sale = $this->sell($cashier);
        $url = "/api/v1/admin/tickets/{$sale['folio']}/cancel";

        $this->actAs($cashier)->postJson($url, ['reason' => 'Primera'])->assertOk();
        $before = Ticket::query()->findOrFail($sale['folio'])->getAttributes();

        $this->actAs($cashier)->postJson($url, ['reason' => 'Segunda'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Este boleto ya está cancelado.');

        $this->assertSame($before, Ticket::query()->findOrFail($sale['folio'])->getAttributes());
    }
}
