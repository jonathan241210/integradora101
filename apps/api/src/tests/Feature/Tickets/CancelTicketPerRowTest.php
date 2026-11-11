<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;

class CancelTicketPerRowTest extends TicketFeatureTestCase
{
    public function test_ca51_ticket_sales_cancelling_one_child_ticket_leaves_three_valid_and_57_00_of_revenue(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $admin = $this->createAccount('admin');
        $this->setPrices($cashier, '25.00', '16.00');
        $this->travelTo($this->at('2026-11-06 18:00:00'));

        $summary = fn () => $this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?period=week&date=2026-11-06')->assertOk()->json('data.totals');
        // Diferencias respecto al estado previo de la base de pruebas (CA-51 sobre las cifras de api-007 CA-29).
        $delta = fn (array $now, array $base) => [
            'tickets' => $now['tickets'] - $base['tickets'],
            'adults' => $now['adults'] - $base['adults'],
            'children' => $now['children'] - $base['children'],
            'revenue' => number_format((float) $now['revenue'] - (float) $base['revenue'], 2, '.', ''),
        ];
        $dashboard = fn () => $this->actAs($admin)->getJson('/api/v1/admin/dashboard')->assertOk()->json('data.today');
        $base = $summary();
        $dashBase = $dashboard();

        $data = $this->sellPurchase($cashier, 1, 3);
        $folios = array_column($data['tickets'], 'folio');
        $this->assertSame(['adult', 'child', 'child', 'child'], array_column($data['tickets'], 'ticket_type'));

        $this->assertSame(['tickets' => 4, 'adults' => 1, 'children' => 3, 'revenue' => '73.00'], $delta($summary(), $base));
        $this->assertSame(['tickets' => 4, 'adults' => 1, 'children' => 3, 'revenue' => '73.00'], $delta($dashboard(), $dashBase));

        $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$folios[1]}/cancel", ['reason' => 'No entró'])->assertOk();

        $this->assertSame('cancelled', Ticket::query()->findOrFail($folios[1])->status);
        foreach ([$folios[0], $folios[2], $folios[3]] as $folio) {
            $this->assertSame('completed', Ticket::query()->findOrFail($folio)->status);
        }
        $this->assertSame(['tickets' => 3, 'adults' => 1, 'children' => 2, 'revenue' => '57.00'], $delta($summary(), $base));
        $this->assertSame(['tickets' => 3, 'adults' => 1, 'children' => 2, 'revenue' => '57.00'], $delta($dashboard(), $dashBase));
    }
}
