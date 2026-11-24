<?php

namespace Tests\Feature\Admin;

class CancellationReportTotalsTest extends CancellationReportTestCase
{
    private function fixture(): array
    {
        $admin = $this->createAccount('admin');
        $one = $this->createAccount('cashier', true, ['first_name' => 'Ana']);
        $two = $this->createAccount('cashier', true, ['first_name' => 'Beto']);
        $this->clean();
        // Día 8: Ana vende 2 completados y cancela 2; Beto vende 1 y cancela 1.
        $this->insertSale($one, '2033-03-08 16:00:00', ['total_amount' => '25.00']);
        $this->insertSale($one, '2033-03-08 16:30:00', ['adult_quantity' => 1, 'child_quantity' => 1, 'total_amount' => '41.00']);
        $this->cancelledSale($one, '2033-03-08 17:00:00', 5, 'capture_error', null, ['total_amount' => '25.00']);
        $this->cancelledSale($one, '2033-03-08 18:00:00', 5, 'other', 'Un comentario suficientemente largo', ['adult_quantity' => 2, 'total_amount' => '50.00']);
        $this->insertSale($two, '2033-03-08 19:00:00', ['total_amount' => '25.00']);
        $this->cancelledSale($two, '2033-03-08 20:00:00', 5, 'capture_error', null, ['total_amount' => '25.00']);
        // Día 10: solo Beto, un cancelado anterior sin clasificar.
        $this->cancelledSale($two, '2033-03-10 16:00:00', 5, 'capture_error', null, ['cancellation_reason_code' => null, 'total_amount' => '25.00']);

        return [$admin, $one, $two];
    }

    /** CA-14 ticket-cancellation-report */
    public function test_ca14_totals_and_breakdowns_add_up_to_general_total(): void
    {
        [$admin] = $this->fixture();

        $totals = $this->report($admin)['totals'];

        // Boletos = suma de cantidades (2 + 1 + 1 + 1), no filas.
        $this->assertSame(5, $totals['cancelled_tickets']);
        $this->assertSame('125.00', $totals['cancelled_amount']);
        $this->assertSame(5, array_sum(array_column($totals['by_cashier'], 'cancelled_tickets')));
        $this->assertSame(5, array_sum(array_column($totals['by_reason'], 'cancelled_tickets')));
        $this->assertEqualsWithDelta(125.0, array_sum(array_column($totals['by_cashier'], 'cancelled_amount')), 0.001);
        $this->assertEqualsWithDelta(125.0, array_sum(array_column($totals['by_reason'], 'cancelled_amount')), 0.001);
        $this->assertSame(['capture_error', 'other', null], array_column($totals['by_reason'], 'reason_code'));
    }

    /** CA-15 ticket-cancellation-report */
    public function test_ca15_each_day_row_satisfies_gross_equals_net_plus_cancelled(): void
    {
        [$admin] = $this->fixture();

        $days = $this->report($admin)['reconciliation']['days'];

        $this->assertSame([
            ['date' => '2033-03-08', 'gross' => '191.00', 'cancelled' => '100.00', 'net' => '91.00', 'balanced' => true],
            ['date' => '2033-03-10', 'gross' => '25.00', 'cancelled' => '25.00', 'net' => '0.00', 'balanced' => true],
        ], $days);
        foreach ($days as $day) {
            $this->assertEqualsWithDelta((float) $day['gross'], (float) $day['net'] + (float) $day['cancelled'], 0.001);
        }
    }

    /** CA-16 ticket-cancellation-report */
    public function test_ca16_cashier_reconciliation_and_active_days(): void
    {
        [$admin, $one, $two] = $this->fixture();

        $cashiers = collect($this->report($admin)['reconciliation']['cashiers'])->keyBy('cashier_id');

        $this->assertSame('141.00', $cashiers[$one->id]['gross']);
        $this->assertSame('75.00', $cashiers[$one->id]['cancelled']);
        $this->assertSame('66.00', $cashiers[$one->id]['net']);
        $this->assertTrue($cashiers[$one->id]['balanced']);
        $this->assertSame(['2033-03-08'], $cashiers[$one->id]['active_days']);
        $this->assertSame('75.00', $cashiers[$two->id]['gross']);
        $this->assertSame('50.00', $cashiers[$two->id]['cancelled']);
        $this->assertSame('25.00', $cashiers[$two->id]['net']);
        $this->assertSame(['2033-03-08', '2033-03-10'], $cashiers[$two->id]['active_days']);
        $this->assertSame(6, $cashiers[$one->id]['sold_tickets']);
    }
}
