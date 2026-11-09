<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;

class TicketLegacyRowsTest extends TicketFeatureTestCase
{
    public function test_ca55_ticket_sales_legacy_row_with_two_adults_is_listed_and_cancelled_as_one_row(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->travelTo($this->at('2026-11-06 18:00:00'));
        $id = $this->insertSale($cashier, '2026-11-06 17:00:00', ['adult_quantity' => 2, 'child_quantity' => 0, 'total_amount' => '50.00']);

        $row = collect($this->actAs($cashier)->getJson("/api/v1/admin/tickets?folio={$id}")->assertOk()->json('data'))->firstWhere('folio', $id);
        $this->assertSame(2, $row['adult_quantity']);
        $this->assertSame('50.00', $row['total_amount']);
        $this->assertSame(1, Ticket::query()->where('id', $id)->count());

        $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$id}/cancel", ['reason' => 'Fila anterior'])->assertOk();
        $ticket = Ticket::query()->findOrFail($id);
        $this->assertSame('cancelled', $ticket->status);
        $this->assertSame(2, $ticket->adult_quantity);
        $this->assertSame(1, Ticket::query()->where('purchased_at', $ticket->purchased_at)->where('cashier_id', $cashier->id)->count());
    }
}
