<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\DB;

class CancellationReportImmutabilityTest extends CancellationReportTestCase
{
    /** CA-22 ticket-cancellation-report */
    public function test_ca22_query_and_export_do_not_change_cancelled_ticket_snapshot(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $this->clean();
        $this->cancelledSale($cashier, '2033-03-08 16:00:00', 7, 'other', 'Comentario suficientemente largo', ['updated_by' => $cashier->id]);
        $this->cancelledSale($cashier, '2033-03-09 16:00:00', 3, 'capture_error');
        $this->insertSale($cashier, '2033-03-09 17:00:00');
        $snapshot = fn () => DB::table('tickets')->whereBetween('purchased_at', ['2033-03-01 00:00:00', '2033-03-31 00:00:00'])->orderBy('id')->get()->map(fn ($r) => (array) $r)->all();
        $before = $snapshot();

        $this->report($admin);
        foreach (['csv', 'xlsx', 'pdf'] as $format) {
            $this->actAs($admin)->get(self::URL.'/export?'.self::WEEK.'&format='.$format)->assertOk();
        }

        $this->assertSame($before, $snapshot());
        $this->assertCount(3, $before);
    }
}
