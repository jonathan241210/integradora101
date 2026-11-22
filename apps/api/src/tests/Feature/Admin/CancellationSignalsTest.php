<?php

namespace Tests\Feature\Admin;

use App\Enums\CancellationSignal;

/** api-027: señales fijas S1 a S5 por cajero y día (días de 2019, ver CancellationReviewTestCase). */
class CancellationSignalsTest extends CancellationReviewTestCase
{
    private function setup2019(): array
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura']);
        $this->wipe();

        return [$admin, $cashier];
    }

    /** CA-04 cancellation-review-signals */
    public function test_ca04_over_limit_percent_needs_more_than_10_and_10_sold(): void
    {
        [$admin, $cashier] = $this->setup2019();

        // 12 % (3 de 25): dispara.
        $this->dayWithCancels($cashier, self::DAY, 22, ['capture_error', 'duplicate_charge', 'wrong_ticket_type']);
        $day = $this->dayOf($admin, $cashier);
        $this->assertContains('over_limit_percent', $this->signalCodes($day));
        $this->assertSame(3, collect($day['reasons'])->firstWhere('code', 'over_limit_percent')['count']);

        // 10,00 % exacto (2 de 20): no dispara.
        $this->wipe();
        $this->dayWithCancels($cashier, self::DAY, 18, ['capture_error', 'duplicate_charge']);
        $day = $this->dayOf($admin, $cashier);
        $this->assertEquals(10.0, $day['cancel_percent']);
        $this->assertNotContains('over_limit_percent', $this->signalCodes($day));

        // 11,11 % pero con solo 9 boletos vendidos: no dispara.
        $this->wipe();
        $this->dayWithCancels($cashier, self::DAY, 8, ['capture_error']);
        $this->assertNotContains('over_limit_percent', $this->signalCodes($this->dayOf($admin, $cashier)));

        // 20 % con exactamente 10 boletos vendidos: dispara.
        $this->wipe();
        $this->dayWithCancels($cashier, self::DAY, 8, ['capture_error', 'duplicate_charge']);
        $this->assertContains('over_limit_percent', $this->signalCodes($this->dayOf($admin, $cashier)));
    }

    /** CA-05 cancellation-review-signals */
    public function test_ca05_late_cancellations_window_is_inclusive_30_min_before_last_sale(): void
    {
        [$admin, $cashier] = $this->setup2019();

        // Última venta (L) a las 12:00. Cancelaciones compradas a las 09:00 y 09:10.
        $this->completed($cashier, self::DAY, 1, '12:00:00');
        // Ambas canceladas exactamente a L − 30 min (11:30): cuentan (frontera inclusiva).
        $this->cancelAt($cashier, self::DAY, '09:00:00', 150 * 60, 'capture_error', '25.00');
        $this->cancelAt($cashier, self::DAY, '09:10:00', 140 * 60, 'duplicate_charge', '26.00');
        $this->assertContains('late_cancellations', $this->signalCodes($this->dayOf($admin, $cashier)));

        // Una a L − 30 min y otra un segundo antes (L − 30 min − 1 s): solo una cuenta, no dispara.
        $this->wipe();
        $this->completed($cashier, self::DAY, 1, '12:00:00');
        $this->cancelAt($cashier, self::DAY, '09:00:00', 150 * 60, 'capture_error', '25.00');
        $this->cancelAt($cashier, self::DAY, '09:10:00', 140 * 60 - 1, 'duplicate_charge', '26.00');
        $this->assertNotContains('late_cancellations', $this->signalCodes($this->dayOf($admin, $cashier)));

        // Cancelada a L exacto cuenta; después de L no.
        $this->wipe();
        $this->completed($cashier, self::DAY, 1, '12:00:00');
        $this->cancelAt($cashier, self::DAY, '09:00:00', 180 * 60, 'capture_error', '25.00');
        $this->cancelAt($cashier, self::DAY, '09:10:00', 170 * 60, 'duplicate_charge', '26.00');
        $this->assertContains('late_cancellations', $this->signalCodes($this->dayOf($admin, $cashier)));
        $this->wipe();
        $this->completed($cashier, self::DAY, 1, '12:00:00');
        $this->cancelAt($cashier, self::DAY, '09:00:00', 180 * 60, 'capture_error', '25.00');
        $this->cancelAt($cashier, self::DAY, '09:10:00', 170 * 60 + 1, 'duplicate_charge', '26.00');
        $this->assertNotContains('late_cancellations', $this->signalCodes($this->dayOf($admin, $cashier)));
    }

    /** CA-06 cancellation-review-signals */
    public function test_ca06_two_other_reason_cancellations_fire_signal(): void
    {
        [$admin, $cashier] = $this->setup2019();

        $this->dayWithCancels($cashier, self::DAY, 30, ['other', 'other']);
        $this->assertContains('repeated_other', $this->signalCodes($this->dayOf($admin, $cashier)));

        $this->wipe();
        $this->dayWithCancels($cashier, self::DAY, 30, ['other', 'capture_error']);
        $this->assertNotContains('repeated_other', $this->signalCodes($this->dayOf($admin, $cashier)));
    }

    /** CA-07 cancellation-review-signals */
    public function test_ca07_two_cancellations_with_same_amount_fire_signal(): void
    {
        [$admin, $cashier] = $this->setup2019();

        $this->completed($cashier, self::DAY, 30);
        $this->cancelAt($cashier, self::DAY, '09:00:00', 180, 'capture_error', '40.00');
        $this->cancelAt($cashier, self::DAY, '09:10:00', 180, 'duplicate_charge', '40.00');
        $this->assertContains('same_amount', $this->signalCodes($this->dayOf($admin, $cashier)));

        $this->wipe();
        $this->completed($cashier, self::DAY, 30);
        $this->cancelAt($cashier, self::DAY, '09:00:00', 180, 'capture_error', '40.00');
        $this->cancelAt($cashier, self::DAY, '09:10:00', 180, 'duplicate_charge', '40.01');
        $this->assertNotContains('same_amount', $this->signalCodes($this->dayOf($admin, $cashier)));
    }

    /** CA-08 cancellation-review-signals */
    public function test_ca08_two_cancellations_over_30_minutes_fire_signal(): void
    {
        [$admin, $cashier] = $this->setup2019();

        // Más de 1800 s entre venta y cancelación: 1801 s cuenta.
        $this->completed($cashier, self::DAY, 30);
        $this->cancelAt($cashier, self::DAY, '09:00:00', 1801, 'capture_error', '25.00');
        $this->cancelAt($cashier, self::DAY, '09:10:00', 2400, 'duplicate_charge', '26.00');
        $this->assertContains('long_cancellations', $this->signalCodes($this->dayOf($admin, $cashier)));

        // Exactamente 1800 s no cuenta: queda una sola, no dispara.
        $this->wipe();
        $this->completed($cashier, self::DAY, 30);
        $this->cancelAt($cashier, self::DAY, '09:00:00', 1800, 'capture_error', '25.00');
        $this->cancelAt($cashier, self::DAY, '09:10:00', 2400, 'duplicate_charge', '26.00');
        $this->assertNotContains('long_cancellations', $this->signalCodes($this->dayOf($admin, $cashier)));
    }

    /** CA-16 cancellation-review-signals */
    public function test_ca16_thresholds_follow_config_value(): void
    {
        [$admin, $cashier] = $this->setup2019();

        // 15 % (3 de 20) con tres importes distintos: solo S1 y, con el límite en 10, Revisar.
        $this->dayWithCancels($cashier, self::DAY, 17, ['capture_error', 'duplicate_charge', 'wrong_ticket_type']);
        $day = $this->dayOf($admin, $cashier);
        $this->assertContains('over_limit_percent', $this->signalCodes($day));
        $this->assertSame('review', $day['traffic_light']);

        // Con el límite en 20 % la señal ya no salta y el día queda Normal, sin tocar código.
        config(['arca.cancellation_review.over_limit_percent' => 20]);
        $day = $this->dayOf($admin, $cashier);
        $this->assertNotContains('over_limit_percent', $this->signalCodes($day));
        $this->assertSame('normal', $day['traffic_light']);

        // La leyenda sigue el valor configurado.
        $legend = collect($this->report($admin, self::RANGE)['legend'])->firstWhere('code', CancellationSignal::OverLimitPercent->value);
        $this->assertStringContainsString('Más de 20 %', $legend['limit']);

        // El mínimo de señales para Atención también es configuración: con 3, dos señales quedan en Revisar.
        config(['arca.cancellation_review.over_limit_percent' => 10]);
        $this->wipe();
        $this->attentionDay($cashier, self::DAY);
        $this->assertSame('attention', $this->dayOf($admin, $cashier)['traffic_light']);
        config(['arca.cancellation_review.attention_min_signals' => 3]);
        $this->assertSame('review', $this->dayOf($admin, $cashier)['traffic_light']);
    }
}
