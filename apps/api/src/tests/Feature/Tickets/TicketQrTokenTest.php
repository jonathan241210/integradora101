<?php

namespace Tests\Feature\Tickets;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class TicketQrTokenTest extends TicketFeatureTestCase
{
    public function test_ca08_ticket_sales_issues_distinct_unpredictable_tokens_and_database_rejects_duplicates(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);

        $first = $this->sell($cashier);
        $second = $this->sell($cashier);

        $tokenOne = DB::table('tickets')->where('id', $first['folio'])->value('qr_code');
        $tokenTwo = DB::table('tickets')->where('id', $second['folio'])->value('qr_code');

        $this->assertNotSame($tokenOne, $tokenTwo);
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{43}$/', $tokenOne);

        $this->expectException(QueryException::class);
        $this->insertSale($cashier, '2026-11-02 10:00:00', ['qr_code' => $tokenOne]);
    }
}
