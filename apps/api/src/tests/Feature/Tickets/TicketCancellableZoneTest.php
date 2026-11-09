<?php

namespace Tests\Feature\Tickets;

class TicketCancellableZoneTest extends TicketFeatureTestCase
{
    public function test_ca14_ticket_sales_cancellable_uses_zoo_timezone(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $today = $this->insertSale($cashier, '2026-11-02 15:00:00');     // 09:00 del día D en Ciudad de México
        $yesterday = $this->insertSale($cashier, '2026-11-02 03:00:00'); // 21:00 de D-1 en Ciudad de México

        // 23:50 de D en Ciudad de México: ya es D+1 en Madrid y en UTC.
        $this->travelTo($this->at('2026-11-03 05:50:00'));
        $this->assertCancellable($cashier, $today, true, 'Europe/Madrid');
        $this->assertCancellable($cashier, $today, true, 'UTC');
        $this->assertCancellable($cashier, $yesterday, false, 'Europe/Madrid');

        // 12:00 de D en Ciudad de México: la zona de la petición no vuelve cancelable un boleto de D-1.
        $this->travelTo($this->at('2026-11-02 18:00:00'));
        $this->assertCancellable($cashier, $yesterday, false, 'UTC');
        $this->assertCancellable($cashier, $yesterday, false, 'Europe/Madrid');
        $this->assertCancellable($cashier, $today, true, 'Pacific/Auckland');
    }

    private function assertCancellable($cashier, int $folio, bool $expected, string $timezone): void
    {
        $rows = collect($this->actAs($cashier)->getJson('/api/v1/admin/tickets?timezone='.$timezone)->assertOk()->json('data'))->keyBy('folio');
        $this->assertSame($expected, $rows[$folio]['cancellable'], "folio {$folio} con timezone {$timezone}");
    }
}
