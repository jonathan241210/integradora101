<?php

namespace Tests\Feature\Admin;

use Carbon\CarbonImmutable;

class CancellationReportPeriodTest extends CancellationReportTestCase
{
    /** CA-04 ticket-cancellation-report */
    public function test_ca04_week_or_month_without_date_uses_today(): void
    {
        $admin = $this->createAccount('admin');
        // 2033-03-09 03:00 UTC sigue siendo el 8 de marzo en Ciudad de México.
        $this->travelTo(CarbonImmutable::parse('2033-03-09 03:00:00', 'UTC'));

        $week = $this->report($admin, 'period=week')['period'];
        $month = $this->report($admin, 'period=month')['period'];

        $this->assertSame(['2033-03-07', '2033-03-13'], [$week['from'], $week['to']]);
        $this->assertSame(['2033-03-01', '2033-03-31'], [$month['from'], $month['to']]);
        $this->assertSame('America/Mexico_City', $week['timezone']);
    }

    /** CA-04 ticket-cancellation-report */
    public function test_ca04_custom_range_rules_return_422(): void
    {
        $admin = $this->createAccount('admin');

        foreach ([
            'period=custom&from=2033-03-01',
            'period=custom&to=2033-03-01',
            'period=custom&from=2033-03-10&to=2033-03-01',
            'period=custom&from=2032-01-01&to=2033-03-01',
        ] as $query) {
            $this->actAs($admin)->getJson(self::URL.'?'.$query)->assertStatus(422);
        }
        $this->actAs($admin)->getJson(self::URL.'?period=year')->assertStatus(422);
    }

    /** CA-05 ticket-cancellation-report */
    public function test_ca05_cashier_and_reason_filters_recalculate_everything(): void
    {
        $admin = $this->createAccount('admin');
        $one = $this->createAccount('cashier');
        $two = $this->createAccount('cashier');
        $this->clean();
        $this->insertSale($one, '2033-03-08 16:00:00');
        $this->cancelledSale($one, '2033-03-08 17:00:00', 5, 'capture_error');
        $this->cancelledSale($one, '2033-03-08 18:00:00', 5, 'duplicate_charge');
        $this->insertSale($two, '2033-03-08 16:00:00', ['total_amount' => '40.00']);
        $this->cancelledSale($two, '2033-03-09 16:00:00', 5, 'capture_error');

        $all = $this->report($admin);
        $this->assertSame(3, $all['totals']['cancelled_tickets']);
        $this->assertCount(3, $all['rows']);

        $byCashier = $this->report($admin, self::WEEK.'&cashier_id='.$one->id);
        $this->assertSame(2, $byCashier['totals']['cancelled_tickets']);
        $this->assertCount(2, $byCashier['rows']);
        $this->assertSame([$one->id], array_column($byCashier['reconciliation']['cashiers'], 'cashier_id'));
        $this->assertSame('75.00', $byCashier['reconciliation']['days'][0]['gross']);

        $byReason = $this->report($admin, self::WEEK.'&reason_code=capture_error');
        $this->assertSame(2, $byReason['totals']['cancelled_tickets']);
        $this->assertSame(['capture_error'], array_column($byReason['totals']['by_reason'], 'reason_code'));
        $this->assertCount(2, $byReason['rows']);
        $this->assertSame([], array_filter($byReason['rows'], fn ($r) => $r['reason_code'] !== 'capture_error'));
    }

    /** CA-05 ticket-cancellation-report */
    public function test_ca05_invalid_reason_code_or_cashier_returns_422(): void
    {
        $admin = $this->createAccount('admin');
        $vet = $this->createAccount('veterinarian');

        $this->actAs($admin)->getJson(self::URL.'?'.self::WEEK.'&reason_code=nope')
            ->assertStatus(422)->assertJsonValidationErrors(['reason_code'], 'errors');
        $this->actAs($admin)->getJson(self::URL.'?'.self::WEEK.'&cashier_id='.$vet->id)
            ->assertStatus(422)->assertJsonValidationErrors(['cashier_id'], 'errors');
        $this->actAs($admin)->getJson(self::URL.'?'.self::WEEK.'&cashier_id=999999999')->assertStatus(422);
    }
}
