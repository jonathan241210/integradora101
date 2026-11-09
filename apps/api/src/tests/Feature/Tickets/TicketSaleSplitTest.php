<?php

namespace Tests\Feature\Tickets;

use Illuminate\Support\Facades\DB;

class TicketSaleSplitTest extends TicketFeatureTestCase
{
    public function test_ca50_ticket_sales_one_ticket_per_unit_with_ascending_folios_and_own_qr(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier, '25.00', '16.00');
        $payload = ['adult_quantity' => 1, 'child_quantity' => 3];

        $quote = $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', $payload)->assertStatus(200)->json('data');
        $before = $this->ticketCount();
        $data = $this->actAs($cashier)->postJson('/api/v1/admin/tickets', $payload)->assertCreated()->json('data');

        $this->assertSame($before + 4, $this->ticketCount());
        $this->assertSame(1, $data['adult_quantity']);
        $this->assertSame(3, $data['child_quantity']);
        $this->assertSame('73.00', $data['total_amount']);
        $this->assertSame($quote['total_amount'], $data['total_amount']);
        $this->assertCount(4, $data['tickets']);
        $this->assertSame(['adult', 'child', 'child', 'child'], array_column($data['tickets'], 'ticket_type'));
        $this->assertSame(['25.00', '16.00', '16.00', '16.00'], array_column($data['tickets'], 'unit_price'));
        $this->assertSame(['25.00', '16.00', '16.00', '16.00'], array_column($data['tickets'], 'total_amount'));

        $folios = array_column($data['tickets'], 'folio');
        $sorted = $folios;
        sort($sorted);
        $this->assertSame($sorted, $folios);
        $this->assertCount(4, array_unique($folios));

        $rows = DB::table('tickets')->whereIn('id', $folios)->orderBy('id')->get();
        $this->assertCount(4, $rows->pluck('qr_code')->unique());
        $this->assertCount(1, $rows->pluck('purchased_at')->unique());
        $this->assertCount(1, $rows->pluck('cashier_id')->unique());
        $this->assertSame([[1, 0], [0, 1], [0, 1], [0, 1]], $rows->map(fn ($r) => [(int) $r->adult_quantity, (int) $r->child_quantity])->all());
        foreach ($rows as $row) {
            $this->assertSame('25.00', $row->adult_unit_price);
            $this->assertSame('16.00', $row->child_unit_price);
            $this->assertSame('completed', $row->status);
        }

        foreach ($data['tickets'] as $ticket) {
            $this->assertArrayNotHasKey('adult_unit_price', $ticket);
            $this->assertArrayNotHasKey('child_unit_price', $ticket);
            $this->assertArrayNotHasKey('qr_code', $ticket);
            $this->assertStringContainsString('<svg', $ticket['qr_svg']);
        }
        $this->assertCount(4, array_unique(array_column($data['tickets'], 'qr_svg')));
    }
}
