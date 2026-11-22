<?php

namespace Tests\Feature\Timezone;

use Tests\Feature\Tickets\TicketFeatureTestCase;

class ReceiptAndPricesTimezoneTest extends TicketFeatureTestCase
{
    /** CA-12 single-business-timezone */
    public function test_ca12_receipt_and_prices_expose_timezone(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $this->setPrices($admin);

        $this->assertSame('America/Mexico_City', $this->sellPurchase($cashier)['timezone']);
        $current = $this->actAs($admin)->getJson('/api/v1/admin/ticket-prices/current')->assertOk()->json('data');
        $this->assertSame('America/Mexico_City', $current['timezone']);
        $this->assertArrayHasKey('adult', $current);

        config(['arca.timezone' => 'UTC']);
        $this->assertSame('UTC', $this->actAs($admin)->getJson('/api/v1/admin/ticket-prices/current')->json('data.timezone'));
    }
}
