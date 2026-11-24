<?php

namespace Tests\Feature\Admin;

use Illuminate\Testing\TestResponse;

/** api-022, revisión 2026-11-21: paginación de las filas del reporte de cancelaciones. */
class CancellationReportPaginationTest extends CancellationReportTestCase
{
    /** 5 cancelaciones (dos con la misma hora de venta) más 2 completadas; tamaño de página 2. */
    private function fixture(): array
    {
        config(['arca.report_page_size' => 2]);
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Ana']);
        $this->clean();
        $this->insertSale($cashier, '2033-03-08 15:00:00', ['total_amount' => '25.00']);
        $this->insertSale($cashier, '2033-03-08 15:30:00', ['total_amount' => '25.00']);
        $ids = [
            $this->cancelledSale($cashier, '2033-03-08 16:00:00', 5, 'capture_error', null, ['total_amount' => '25.00']),
            $this->cancelledSale($cashier, '2033-03-08 17:00:00', 5, 'capture_error', null, ['total_amount' => '25.00']),
            $this->cancelledSale($cashier, '2033-03-08 17:00:00', 5, 'duplicate_charge', null, ['total_amount' => '25.00']),
            $this->cancelledSale($cashier, '2033-03-09 17:00:00', 5, 'capture_error', null, ['total_amount' => '25.00']),
            $this->cancelledSale($cashier, '2033-03-10 17:00:00', 5, 'capture_error', null, ['total_amount' => '25.00']),
        ];

        return [$admin, $ids];
    }

    private function page(object $admin, ?int $page): TestResponse
    {
        return $this->actAs($admin)->getJson(self::URL.'?'.self::WEEK.($page === null ? '' : '&page='.$page));
    }

    /** CA-27 ticket-cancellation-report */
    public function test_ca27_rows_are_paginated_with_meta_and_page_defaults_to_one(): void
    {
        [$admin, $ids] = $this->fixture();

        $first = $this->page($admin, null)->assertOk();
        $first->assertJsonPath('meta', ['current_page' => 1, 'last_page' => 3, 'per_page' => 2, 'total' => 5]);
        $this->assertSame(array_slice($ids, 0, 2), array_map('intval', array_column($first->json('data.rows'), 'folio')));

        $this->page($admin, 3)->assertOk()
            ->assertJsonPath('meta.current_page', 3)
            ->assertJsonCount(1, 'data.rows');

        $this->actAs($admin)->getJson(self::URL.'?'.self::WEEK.'&page=0')->assertStatus(422);
        $this->actAs($admin)->getJson(self::URL.'?'.self::WEEK.'&page=abc')->assertStatus(422);
    }

    /** CA-28 ticket-cancellation-report */
    public function test_ca28_totals_and_reconciliation_do_not_change_between_pages(): void
    {
        [$admin] = $this->fixture();

        $one = $this->page($admin, 1)->json('data');
        $three = $this->page($admin, 3)->json('data');

        $this->assertSame(5, $one['totals']['cancelled_tickets']);
        $this->assertSame('125.00', $one['totals']['cancelled_amount']);
        $this->assertSame('125.00', $one['reconciliation']['days'][0]['gross']);
        $this->assertSame($one['totals'], $three['totals']);
        $this->assertSame($one['reconciliation'], $three['reconciliation']);
        $this->assertSame($one['period'], $three['period']);
    }

    /** CA-29 ticket-cancellation-report */
    public function test_ca29_out_of_range_page_returns_empty_rows_like_ticket_report(): void
    {
        [$admin] = $this->fixture();

        $response = $this->page($admin, 9)->assertOk();
        $response->assertJsonPath('data.rows', [])
            ->assertJsonPath('meta', ['current_page' => 9, 'last_page' => 3, 'per_page' => 2, 'total' => 5]);
        $this->assertSame(5, $response->json('data.totals.cancelled_tickets'));
    }

    /** CA-30 ticket-cancellation-report */
    public function test_ca30_order_is_stable_across_pages_with_id_tiebreak(): void
    {
        [$admin, $ids] = $this->fixture();

        $folios = [];
        foreach ([1, 2, 3] as $page) {
            $folios = array_merge($folios, array_column($this->page($admin, $page)->json('data.rows'), 'folio'));
        }

        $this->assertSame($ids, array_map('intval', $folios));
    }

    /** CA-31 ticket-cancellation-report */
    public function test_ca31_export_is_not_paginated(): void
    {
        [$admin, $ids] = $this->fixture();

        $csv = $this->actAs($admin)->get(self::URL.'/export?'.self::WEEK.'&format=csv&page=2')->assertOk()->streamedContent();

        // Las 5 cancelaciones salen aunque el tamaño de página sea 2 y se envíe page.
        foreach ($ids as $id) {
            $this->assertStringContainsString("{$id},1,0,25.00", $csv);
        }
    }

    /** CA-27 cancellation-review-signals */
    public function test_ca27_cashier_days_identical_across_pages(): void
    {
        [$admin] = $this->fixture();

        $one = $this->page($admin, 1)->json('data.reconciliation.cashier_days');
        $two = $this->page($admin, 2)->json('data.reconciliation.cashier_days');
        $three = $this->page($admin, 3)->json('data.reconciliation.cashier_days');

        $this->assertNotEmpty($one);
        $this->assertSame($one, $two);
        $this->assertSame($one, $three);
    }

    /** CA-29 ticket-cancellation-report: una página enorme devuelve la lista vacía sin desbordar el desplazamiento. */
    public function test_ca29_huge_page_returns_empty_rows(): void
    {
        [$admin] = $this->fixture();

        $response = $this->page($admin, PHP_INT_MAX)->assertOk();

        $this->assertSame([], $response->json('data.rows'));
        $response->assertJsonPath('meta.total', 5);
        $this->assertSame(5, $response->json('data.totals.cancelled_tickets'));
    }
}
