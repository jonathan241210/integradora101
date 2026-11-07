<?php

namespace Tests\Feature\Tickets;

use Illuminate\Support\Facades\DB;

class TicketSaleBatchSizeTest extends TicketFeatureTestCase
{
    public function test_ca54_ticket_sales_largest_sale_of_50_tickets_in_one_transaction_and_response(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier, '25.00', '16.00');
        $before = $this->ticketCount();
        $logs = $this->activityCount('ticket-sold');

        $start = hrtime(true);
        $response = $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 25, 'child_quantity' => 25])->assertCreated();
        $seconds = (hrtime(true) - $start) / 1e9;
        $bytes = strlen($response->getContent());
        $data = $response->json('data');

        $this->assertCount(50, $data['tickets']);
        $this->assertSame($before + 50, $this->ticketCount());
        $this->assertSame($logs + 50, $this->activityCount('ticket-sold'));
        $this->assertCount(50, array_unique(array_column($data['tickets'], 'qr_svg')));
        $this->assertSame('1025.00', $data['total_amount']);
        $this->assertSame(50, DB::table('tickets')->whereIn('id', array_column($data['tickets'], 'folio'))->distinct()->count('qr_code'));

        // Evidencia de CA-54 / RN-37 (sin umbral fijo).
        fwrite(STDERR, sprintf("\n[CA-54] venta de 50 boletos: %.2f s, %d bytes\n", $seconds, $bytes));
    }
}
