<?php

namespace Tests\Feature\Admin;

class CancellationReportParityTest extends CancellationReportTestCase
{
    private function daily(array $report): array
    {
        return collect($report)->mapWithKeys(fn ($d) => [$d['date'] => $d['revenue'] ?? $d['net']])->all();
    }

    /** CA-17 ticket-cancellation-report */
    public function test_ca17_daily_net_equals_daily_revenue_of_tickets_report_with_cancellations(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $this->clean();
        $this->insertSale($cashier, '2033-03-08 16:00:00', ['total_amount' => '25.00']);
        $this->insertSale($cashier, '2033-03-09 05:30:00', ['total_amount' => '41.00']); // 8 de marzo, 23:30 local
        $this->cancelledSale($cashier, '2033-03-08 17:00:00', 5, 'capture_error', null, ['total_amount' => '50.00']);
        $this->insertSale($cashier, '2033-03-11 16:00:00', ['total_amount' => '16.00']);

        $net = $this->daily($this->report($admin)['reconciliation']['days']);
        $revenue = $this->daily($this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?'.self::WEEK)->assertOk()->json('data.daily'));

        $this->assertSame('66.00', $net['2033-03-08']);
        foreach ($net as $date => $amount) {
            $this->assertSame($revenue[$date], $amount, $date);
        }
    }

    /** CA-08 single-business-timezone */
    public function test_ca08_api025_cancellation_counts_on_the_business_day(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $this->clean('2026-11-01 00:00:00', '2026-11-30 00:00:00');
        // Venta 22:50 del 6 de nov. local (04:50 UTC del 7) y cancelación a las 23:10 locales (05:10 UTC del 7).
        $this->cancelledSale($cashier, '2026-11-07 04:50:00', 20, 'capture_error', null, ['total_amount' => '25.00']);
        $this->insertSale($cashier, '2026-11-07 15:00:00', ['total_amount' => '40.00']); // 7 de nov. local

        $query = 'period=custom&from=2026-11-06&to=2026-11-07';
        $report = $this->report($admin, $query);
        $days = collect($report['reconciliation']['days'])->keyBy('date');

        $this->assertSame('25.00', $days['2026-11-06']['cancelled']);
        $this->assertSame('0.00', $days['2026-11-06']['net']);
        $this->assertSame('40.00', $days['2026-11-07']['net']);
        $this->assertSame('2026-11-07T05:10:00Z', $report['rows'][0]['cancelled_at']);

        $revenue = $this->daily($this->actAs($admin)->getJson('/api/v1/admin/reports/tickets?'.$query)->assertOk()->json('data.daily'));
        $this->assertSame($revenue['2026-11-06'], $days['2026-11-06']['net']);
        $this->assertSame($revenue['2026-11-07'], $days['2026-11-07']['net']);
    }
}
