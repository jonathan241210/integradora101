<?php

namespace Tests\Feature\Admin;

/** api-027: nivel del semáforo con escenarios realistas de taquilla. */
class CancellationLevelTest extends CancellationReviewTestCase
{
    /** CA-11 cancellation-review-signals: un día Normal con una cancelación legítima. */
    public function test_ca11_zero_signals_normal(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura', 'last_name' => 'Cruz']);
        $this->wipe();

        // 15 boletos vendidos y uno cancelado a los 3 minutos por error de captura (6,67 %).
        $this->normalDay($cashier, self::DAY);

        $day = $this->dayOf($admin, $cashier);
        $this->assertSame('normal', $day['traffic_light']);
        $this->assertSame('Normal', $day['traffic_light_label']);
        $this->assertSame(0, $day['signals_count']);
        $this->assertSame([], $day['reasons']);
        $this->assertNull($day['reason_sentence']);
        $this->assertSame('Sin acción: no hay señales que revisar.', $day['action']);
        $this->assertNull($day['review']);
    }

    /** CA-11 cancellation-review-signals: un día Revisar con una sola señal. */
    public function test_ca11_one_signal_review(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura', 'last_name' => 'Cruz']);
        $this->wipe();

        // Dos cancelaciones de $25.00 entre 40 boletos (5 %): solo salta «mismo importe».
        $this->reviewDay($cashier, self::DAY);

        $day = $this->dayOf($admin, $cashier);
        $this->assertSame(['same_amount'], $this->signalCodes($day));
        $this->assertSame('review', $day['traffic_light']);
        $this->assertSame('Revisar', $day['traffic_light_label']);
        $this->assertSame(1, $day['signals_count']);
        $this->assertStringStartsWith('Se activó 1 señal: ', $day['reason_sentence']);
    }

    /** CA-11 cancellation-review-signals: un día Atención con cancelaciones tardías y «Otro» repetido. */
    public function test_ca11_two_signals_attention(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura', 'last_name' => 'Cruz']);
        $this->wipe();

        // Dos cancelaciones «Otro» de importes distintos, canceladas poco antes de la última venta.
        $this->attentionDay($cashier, self::DAY);

        $day = $this->dayOf($admin, $cashier);
        $this->assertEqualsCanonicalizing(['late_cancellations', 'repeated_other'], $this->signalCodes($day));
        $this->assertSame('attention', $day['traffic_light']);
        $this->assertSame('Atención', $day['traffic_light_label']);
        $this->assertSame(2, $day['signals_count']);
        $this->assertStringStartsWith('Se activaron 2 señales: ', $day['reason_sentence']);
    }

    /** CA-12 cancellation-review-signals */
    public function test_ca12_filters_do_not_change_traffic_light(): void
    {
        $admin = $this->createAccount('admin');
        $laura = $this->createAccount('cashier', true, ['first_name' => 'Laura']);
        $beto = $this->createAccount('cashier', true, ['first_name' => 'Beto']);
        $this->wipe();
        $this->attentionDay($laura, self::DAY);
        $this->normalDay($beto, self::DAY);

        $unfiltered = $this->report($admin, self::RANGE)['reconciliation']['cashier_days'];
        $this->assertCount(2, $unfiltered);

        // El filtro de motivo no toca el semáforo; el de cajero solo recorta la lista (api-022 CA-34, revisión 2026-11-21 c)
        // y deja el nivel de cada cajero como en la consulta sin filtro.
        foreach (['&reason_code=other', '&reason_code=capture_error'] as $filter) {
            $this->assertSame($unfiltered, $this->report($admin, self::RANGE.$filter)['reconciliation']['cashier_days'], $filter);
        }
        foreach ([$laura, $beto] as $cashier) {
            $expected = array_values(array_filter($unfiltered, fn (array $day): bool => $day['cashier_id'] === $cashier->id));
            foreach (["&cashier_id={$cashier->id}", "&cashier_id={$cashier->id}&reason_code=other"] as $filter) {
                $this->assertSame($expected, $this->report($admin, self::RANGE.$filter)['reconciliation']['cashier_days'], $filter);
            }
        }

        // Los totales y las filas sí obedecen al filtro (api-022), el semáforo no.
        $this->assertSame(0, $this->report($admin, self::RANGE.'&reason_code=duplicate_charge')['totals']['cancelled_tickets']);
    }

    /** CA-11 cancellation-review-signals: `levels[]` explica cada nivel con el umbral configurado. */
    public function test_ca11_levels_describe_each_level_from_the_configured_threshold(): void
    {
        $admin = $this->createAccount('admin');
        $this->wipe();

        $levels = $this->report($admin, self::RANGE)['levels'];
        $this->assertSame(['normal', 'review', 'attention'], array_column($levels, 'code'));
        $this->assertSame(['Normal', 'Revisar', 'Atención'], array_column($levels, 'label'));
        $this->assertSame(['0 señales', '1 señal', '2 o más señales'], array_column($levels, 'condition'));

        config(['arca.cancellation_review.attention_min_signals' => 3]);
        $levels = $this->report($admin, self::RANGE)['levels'];
        $this->assertSame(['0 señales', 'de 1 a 2 señales', '3 o más señales'], array_column($levels, 'condition'));
    }
}
