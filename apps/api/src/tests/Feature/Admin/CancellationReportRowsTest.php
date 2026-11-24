<?php

namespace Tests\Feature\Admin;

class CancellationReportRowsTest extends CancellationReportTestCase
{
    /** CA-06 ticket-cancellation-report */
    public function test_ca06_row_contains_all_listed_fields_for_cancelled_tickets_only(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Cajera', 'last_name' => 'Uno']);
        $this->clean();
        $this->insertSale($cashier, '2033-03-08 15:00:00');
        $id = $this->cancelledSale($cashier, '2033-03-08 16:00:00', 12, 'other', 'Comentario de más de quince', ['adult_quantity' => 2, 'child_quantity' => 1, 'total_amount' => '66.00']);

        $rows = $this->report($admin)['rows'];

        $this->assertCount(1, $rows);
        $this->assertSame([
            'folio' => (string) $id,
            'adult_quantity' => 2,
            'child_quantity' => 1,
            'total_amount' => '66.00',
            'purchased_at' => '2033-03-08T16:00:00Z',
            'cancelled_at' => '2033-03-08T16:12:00Z',
            'cashier_name' => 'Cajera Uno',
            'cancelled_by_name' => 'Cajera Uno',
            'reason_code' => 'other',
            'reason_label' => 'Otro',
            'comment' => 'Comentario de más de quince',
            'minutes_to_cancel' => 12,
            'late_cancellation' => false,
            'signal_codes' => [],
        ], $rows[0]);
    }

    /** CA-08 ticket-cancellation-report */
    public function test_ca08_row_without_code_shows_unclassified_label_and_keeps_amounts(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $this->clean();
        $this->cancelledSale($cashier, '2033-03-08 16:00:00', 3, 'capture_error', 'Texto que ya tenía', ['cancellation_reason_code' => null, 'total_amount' => '25.00']);

        $data = $this->report($admin);
        $row = $data['rows'][0];

        $this->assertNull($row['reason_code']);
        $this->assertSame('Sin clasificar (anterior)', $row['reason_label']);
        $this->assertSame('Texto que ya tenía', $row['comment']);
        $this->assertSame('25.00', $row['total_amount']);
        $this->assertSame(1, $row['adult_quantity']);
        $this->assertSame([['reason_code' => null, 'reason_label' => 'Sin clasificar (anterior)', 'cancelled_tickets' => 1, 'cancelled_amount' => '25.00']], $data['totals']['by_reason']);
    }

    /** CA-09 ticket-cancellation-report */
    public function test_ca09_soft_deleted_cashier_name_stays_visible(): void
    {
        $admin = $this->createAccount('admin');
        $seller = $this->createAccount('cashier', true, ['first_name' => 'Vendedora']);
        $canceller = $this->createAccount('cashier', true, ['first_name' => 'Cancelador']);
        $this->clean();
        $this->cancelledSale($seller, '2033-03-08 16:00:00', 4, 'capture_error', null, ['cancelled_by' => $canceller->id]);
        $seller->delete();
        $canceller->delete();

        $report = $this->report($admin);

        $this->assertSame('Vendedora Prueba', $report['rows'][0]['cashier_name']);
        $this->assertSame('Cancelador Prueba', $report['rows'][0]['cancelled_by_name']);
        $this->assertSame('Vendedora Prueba', $report['totals']['by_cashier'][0]['cashier_name']);

        // El filtro por cajero admite cuentas eliminadas lógicamente (RN-16).
        $this->assertCount(1, $this->report($admin, self::WEEK.'&cashier_id='.$seller->id)['rows']);
    }
}
