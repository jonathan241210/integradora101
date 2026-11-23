<?php

namespace Tests\Feature\Admin;

use App\Actions\Admin\Reports\PresentCancelledTicketRow;

/**
 * Revisión 2026-11-21 (c) de api-022 y api-027: folios por señal, frase clara, `days_to_review`,
 * `cashier_days` con `cashier_id` y exportación con filtros.
 */
class CancellationReportClearSignalsTest extends CancellationReviewTestCase
{
    /** Día con 4 cancelaciones: A y B «Otro» del mismo importe, C y D tardías respecto a la venta. */
    private function mixedDay($cashier, string $date): array
    {
        $this->completed($cashier, $date, 25);
        $a = $this->cancelAt($cashier, $date, '09:00:00', 180, 'other', '25.00', 'Cancelación uno');
        $b = $this->cancelAt($cashier, $date, '09:10:00', 180, 'other', '25.00', 'Cancelación dos');
        $c = $this->cancelAt($cashier, $date, '09:20:00', 2400, 'capture_error', '31.00');
        $d = $this->cancelAt($cashier, $date, '09:30:00', 2700, 'capture_error', '32.00');

        return [(string) $a, (string) $b, (string) $c, (string) $d];
    }

    /** CA-34 cancellation-review-signals: cada señal trae solo los folios que la activan. */
    public function test_ca34_reasons_list_the_right_folios_per_signal(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura', 'last_name' => 'Cruz']);
        $this->wipe();
        [$a, $b, $c, $d] = $this->mixedDay($cashier, self::DAY);

        $day = $this->dayOf($admin, $cashier);
        $reasons = collect($day['reasons'])->keyBy('code');

        $this->assertSame([$a, $b, $c, $d], $reasons['over_limit_percent']['folios']); // porcentaje: todos los cancelados
        $this->assertSame([$a, $b], $reasons['repeated_other']['folios']);
        $this->assertSame([$a, $b], $reasons['same_amount']['folios']);
        $this->assertSame([$c, $d], $reasons['long_cancellations']['folios']);
        $this->assertArrayNotHasKey('late_cancellations', $reasons->all());
        $this->assertSame(['code', 'label', 'count', 'detail', 'folios'], array_keys($day['reasons'][0]));
    }

    /** CA-32 ticket-cancellation-report: `late_cancellation` y `signal_codes` por boleto, sin `alert`. */
    public function test_ca32_rows_have_late_cancellation_and_signal_codes(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura', 'last_name' => 'Cruz']);
        $this->wipe();
        [$a, $b, $c, $d] = $this->mixedDay($cashier, self::DAY);

        $rows = collect($this->report($admin, self::RANGE)['rows'])->keyBy('folio');

        $this->assertSame(['over_limit_percent', 'repeated_other', 'same_amount'], $rows[$a]['signal_codes']);
        $this->assertSame(['over_limit_percent', 'long_cancellations'], $rows[$c]['signal_codes']);
        $this->assertFalse($rows[$a]['late_cancellation']);
        $this->assertTrue($rows[$c]['late_cancellation']);
        $this->assertTrue($rows[$d]['late_cancellation']);
        $this->assertArrayNotHasKey('alert', $rows[$a]);
        $this->assertArrayNotHasKey('alert_reasons', $rows[$a]);

        // Boleto sin señales: cancelación de un cajero y día Normal.
        $normal = $this->createAccount('cashier');
        $this->normalDay($normal, '2019-03-07');
        $quiet = collect($this->report($admin, self::RANGE)['rows'])->firstWhere('cashier_name', PresentCancelledTicketRow::personName($normal));
        $this->assertSame([], $quiet['signal_codes']);
    }

    /** CA-35 cancellation-review-signals: frase clara con una y con dos señales. */
    public function test_ca35_clear_sentence_with_one_and_two_signals(): void
    {
        $admin = $this->createAccount('admin');
        $one = $this->createAccount('cashier', true, ['first_name' => 'Ana', 'last_name' => 'Uno']);
        $two = $this->createAccount('cashier', true, ['first_name' => 'Berta', 'last_name' => 'Dos']);
        $this->wipe();
        $this->reviewDay($one, self::DAY);
        $this->attentionDay($two, self::DAY);

        $this->assertSame(
            'Se activó 1 señal: Mismo importe repetido (2 boletos).',
            $this->dayOf($admin, $one)['reason_sentence'],
        );
        $this->assertSame(
            'Se activaron 2 señales: Motivo «Otro» repetido (2 boletos); Cancelaciones cerca del cierre del cajero (2 boletos).',
            $this->dayOf($admin, $two)['reason_sentence'],
        );
    }

    /** CA-36 cancellation-review-signals: la leyenda usa los mismos labels claros que las razones. */
    public function test_ca36_legend_uses_the_same_clear_labels(): void
    {
        $admin = $this->createAccount('admin');
        $this->wipe();

        $labels = array_column($this->report($admin, self::RANGE)['legend'], 'label', 'code');

        $this->assertSame([
            'over_limit_percent' => 'Porcentaje de cancelación alto',
            'late_cancellations' => 'Cancelaciones cerca del cierre del cajero',
            'repeated_other' => 'Motivo «Otro» repetido',
            'same_amount' => 'Mismo importe repetido',
            'long_cancellations' => 'Cancelaciones más de 30 min después de la venta',
            'own_baseline' => 'Por encima de su promedio',
            'peer_comparison' => 'Por encima de sus compañeros',
        ], $labels);
    }

    /** CA-33 ticket-cancellation-report: `days_to_review` cuadra con los niveles de `cashier_days`. */
    public function test_ca33_days_to_review_matches_cashier_days(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura', 'last_name' => 'Cruz']);
        $quiet = $this->createAccount('cashier', true, ['first_name' => 'Zoe', 'last_name' => 'Calma']);
        $this->wipe();
        $this->attentionDay($cashier, '2019-03-04');
        $this->reviewDay($cashier, '2019-03-05');
        $this->attentionDay($cashier, '2019-03-06');
        $this->normalDay($cashier, '2019-03-07');
        $this->normalDay($quiet, '2019-03-07');

        $report = $this->report($admin, self::RANGE);
        $byCashier = collect($report['reconciliation']['cashiers'])->keyBy('cashier_id');

        $this->assertSame(['attention' => 2, 'review' => 1], $byCashier[$cashier->id]['days_to_review']);
        $this->assertSame(['attention' => 0, 'review' => 0], $byCashier[$quiet->id]['days_to_review']);
        foreach ($byCashier as $id => $row) {
            $days = collect($report['reconciliation']['cashier_days'])->where('cashier_id', $id);
            $this->assertSame($days->where('traffic_light', 'attention')->count(), $row['days_to_review']['attention']);
            $this->assertSame($days->where('traffic_light', 'review')->count(), $row['days_to_review']['review']);
        }
    }

    /** CA-34 ticket-cancellation-report: `cashier_id` reduce `cashier_days` sin cambiar el nivel; `reason_code` no la filtra. */
    public function test_ca34_cashier_filter_reduces_cashier_days_without_changing_level(): void
    {
        $admin = $this->createAccount('admin');
        $laura = $this->createAccount('cashier', true, ['first_name' => 'Laura', 'last_name' => 'Cruz']);
        $berta = $this->createAccount('cashier', true, ['first_name' => 'Berta', 'last_name' => 'Dos']);
        $this->wipe();
        $this->attentionDay($laura, self::DAY);
        $this->reviewDay($berta, self::DAY);

        $all = $this->report($admin, self::RANGE);
        $filtered = $this->report($admin, self::RANGE.'&cashier_id='.$laura->id);
        $byReason = $this->report($admin, self::RANGE.'&reason_code=other');

        $this->assertCount(2, $all['reconciliation']['cashier_days']);
        $this->assertCount(1, $filtered['reconciliation']['cashier_days']);
        $this->assertSame($laura->id, $filtered['reconciliation']['cashier_days'][0]['cashier_id']);
        $this->assertSame(
            $this->cashierDay($all, $laura->id, self::DAY),
            $this->cashierDay($filtered, $laura->id, self::DAY),
        );
        $this->assertSame('attention', $filtered['reconciliation']['cashier_days'][0]['traffic_light']);
        $this->assertCount(2, $byReason['reconciliation']['cashier_days']);
        $this->assertSame($this->cashierDay($all, $berta->id, self::DAY), $this->cashierDay($byReason, $berta->id, self::DAY));
    }

    /** CA-35 ticket-cancellation-report: la exportación no trae «Alerta» y suma las columnas nuevas. */
    public function test_ca35_export_has_new_columns_and_no_alert_column(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura', 'last_name' => 'Cruz']);
        $this->wipe();
        $this->attentionDay($cashier, '2019-03-04');
        $this->reviewDay($cashier, '2019-03-05');

        $csv = $this->actAs($admin)->get(self::URL.'/export?'.self::RANGE.'&format=csv')->assertOk()->streamedContent();

        $this->assertDoesNotMatchRegularExpression('/(^|[,"])Alerta([,"]|$)/m', $csv);
        foreach (['Días por revisar', '1 en Atención · 1 en Revisar', 'Cancelación tardía (más de 30 min)', 'Señales', 'Folios', 'Mismo importe repetido'] as $needle) {
            $this->assertStringContainsString($needle, $csv, $needle);
        }
    }

    /** CA-36 ticket-cancellation-report y CA-37 cancellation-review-signals: la exportación filtrada solo trae lo filtrado. */
    public function test_ca36_filtered_export_only_contains_filtered_cashier(): void
    {
        $admin = $this->createAccount('admin');
        $laura = $this->createAccount('cashier', true, ['first_name' => 'Laura', 'last_name' => 'Cruz']);
        $berta = $this->createAccount('cashier', true, ['first_name' => 'Berta', 'last_name' => 'Dos']);
        $this->wipe();
        $this->attentionDay($laura, self::DAY);
        $this->reviewDay($berta, self::DAY);
        $lauraFolios = collect($this->dayOf($admin, $laura)['reasons'])->pluck('folios')->flatten()->unique()->all();

        $csv = $this->actAs($admin)->get(self::URL.'/export?'.self::RANGE.'&cashier_id='.$laura->id.'&format=csv')->assertOk()->streamedContent();

        $this->assertStringContainsString('Laura Cruz', $csv);
        $this->assertStringNotContainsString('Berta Dos', $csv);
        $this->assertStringContainsString('Motivo «Otro» repetido: '.implode(', ', $lauraFolios), $csv);
        $this->assertStringNotContainsString('Mismo importe repetido', explode('Leyenda del semáforo', $csv)[0]);
        $this->assertStringContainsString('Filtro de cajero', $csv);
    }
}
