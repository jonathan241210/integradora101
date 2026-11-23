<?php

namespace Tests\Feature\Admin;

/**
 * Cancelación tardía por boleto (api-022 CA-18, CA-25) tras la revisión 2026-11-21 (c): las alertas viejas
 * (`alert`, `alert_reasons`, alerta por cajero) se retiran; queda `late_cancellation` y el umbral de configuración.
 */
class CancellationReportAlertsTest extends CancellationReportTestCase
{
    /** CA-18 ticket-cancellation-report (sustituido por la revisión 2026-11-21 c: ahora `late_cancellation`) */
    public function test_ca18_late_cancellation_after_30_minutes(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $this->clean();
        $exact = $this->cancelledSale($cashier, '2033-03-08 16:00:00', 30);
        $late = $this->cancelledSale($cashier, '2033-03-08 17:00:00', 31);

        $report = $this->report($admin);
        $rows = collect($report['rows'])->keyBy('folio');

        $this->assertFalse($rows[(string) $exact]['late_cancellation']); // exactamente 1800 s no es «más de 30 minutos»
        $this->assertTrue($rows[(string) $late]['late_cancellation']);
        $this->assertArrayNotHasKey('alert', $rows[(string) $late]);
        $this->assertArrayNotHasKey('alert_reasons', $rows[(string) $late]);
        $this->assertArrayNotHasKey('alert', $report['reconciliation']['cashiers'][0]);
        $this->assertArrayNotHasKey('alert_reasons', $report['reconciliation']['cashiers'][0]);
    }

    /** CA-18 ticket-cancellation-report */
    public function test_ca18_late_cancellation_does_not_block_or_change_data(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $this->clean();
        $id = $this->cancelledSale($cashier, '2033-03-08 16:00:00', 90);
        $before = (array) \DB::table('tickets')->find($id);

        $report = $this->report($admin);

        $this->assertTrue($report['rows'][0]['late_cancellation']);
        $this->assertSame($before, (array) \DB::table('tickets')->find($id));
        $this->assertTrue($report['reconciliation']['days'][0]['balanced']);

        // La cancelación nunca se bloquea: se cancela un boleto vendido para el mismo día.
        $this->setPrices($cashier);
        $sale = $this->sell($cashier);
        $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$sale['folio']}/cancel", ['reason_code' => 'capture_error'])->assertOk();
    }

    /** CA-25 ticket-cancellation-report */
    public function test_ca25_late_threshold_follows_config_value(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $this->clean();
        $this->insertSale($cashier, '2033-03-08 16:00:00');
        $this->cancelledSale($cashier, '2033-03-08 17:00:00', 10);

        $this->assertFalse($this->report($admin)['rows'][0]['late_cancellation']);

        config(['arca.cancellation_alerts.cancel_after_minutes' => 5]);

        $this->assertTrue($this->report($admin)['rows'][0]['late_cancellation']);
    }
}
