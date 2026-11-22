<?php

namespace Tests\Feature\Admin;

/** api-027: comparaciones C1 (propio histórico) y C2 (compañeros). */
class CancellationComparisonTest extends CancellationReviewTestCase
{
    /** Tres días de historial de 20 ventas con una cancelación cada uno: B = 3/60 = 5 %. */
    private function history(object $cashier, array $dates = ['2019-02-20', '2019-02-21', '2019-02-25'], int $sold = 19, int $cancels = 1): void
    {
        foreach ($dates as $date) {
            $this->dayWithCancels($cashier, $date, $sold, array_fill(0, $cancels, 'capture_error'));
        }
    }

    /** CA-09 cancellation-review-signals */
    public function test_ca09_own_baseline_fires_only_with_history_and_floors(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura']);

        // Histórico de 3 días con B = 5 %; el día evaluado: 2 de 20 = 10 % = 2 × B exacto. Dispara (frontera inclusiva).
        $this->wipe();
        $this->history($cashier);
        $this->dayWithCancels($cashier, self::DAY, 18, ['capture_error', 'duplicate_charge']);
        $day = $this->dayOf($admin, $cashier);
        $this->assertSame(['own_baseline'], $this->signalCodes($day));
        $this->assertSame('review', $day['traffic_light']);
        $this->assertSame(2, $day['reasons'][0]['count']);

        // Solo 2 días con actividad en las 4 semanas: la comparación no se evalúa.
        $this->wipe();
        $this->history($cashier, ['2019-02-20', '2019-02-21']);
        $this->dayWithCancels($cashier, self::DAY, 18, ['capture_error', 'duplicate_charge']);
        $this->assertNotContains('own_baseline', $this->signalCodes($this->dayOf($admin, $cashier)));

        // El historial anterior a 28 días no cuenta (2019-02-05 queda fuera de 02-06 a 03-05).
        $this->wipe();
        $this->history($cashier, ['2019-02-05', '2019-02-21', '2019-02-25']);
        $this->dayWithCancels($cashier, self::DAY, 18, ['capture_error', 'duplicate_charge']);
        $this->assertNotContains('own_baseline', $this->signalCodes($this->dayOf($admin, $cashier)));

        // Por debajo del doble (9,52 % contra 2 × 5 %): no dispara.
        $this->wipe();
        $this->history($cashier);
        $this->dayWithCancels($cashier, self::DAY, 19, ['capture_error', 'duplicate_charge']);
        $this->assertNotContains('own_baseline', $this->signalCodes($this->dayOf($admin, $cashier)));

        // Suelo del 5 %: histórico de 1 % y día de 4 % (más del doble, pero bajo 5 %): no dispara.
        $this->wipe();
        $this->history($cashier, sold: 99);
        $this->dayWithCancels($cashier, self::DAY, 48, ['capture_error', 'duplicate_charge']);
        $this->assertNotContains('own_baseline', $this->signalCodes($this->dayOf($admin, $cashier)));

        // Suelo de 2 cancelaciones: 1 de 10 (10 %) sobre un histórico de 5 % no dispara.
        $this->wipe();
        $this->history($cashier);
        $this->dayWithCancels($cashier, self::DAY, 9, ['capture_error']);
        $this->assertNotContains('own_baseline', $this->signalCodes($this->dayOf($admin, $cashier)));
    }

    /** CA-10 cancellation-review-signals */
    public function test_ca10_peer_median_fires_only_with_two_peers_and_floors(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura']);
        $peerA = $this->createAccount('cashier', true, ['first_name' => 'Beto']);
        $peerB = $this->createAccount('cashier', true, ['first_name' => 'Carla']);

        // Compañeros del 0 % y 10 %: mediana (par) = 5 %. Laura con 2 de 20 = 10 % = 2 × M: dispara.
        $this->wipe();
        $this->dayWithCancels($peerA, '2019-03-04', 20);
        $this->dayWithCancels($peerB, '2019-03-05', 18, ['capture_error', 'duplicate_charge']);
        $this->dayWithCancels($cashier, self::DAY, 18, ['capture_error', 'duplicate_charge']);
        $day = $this->dayOf($admin, $cashier);
        $this->assertSame(['peer_comparison'], $this->signalCodes($day));
        $this->assertSame('review', $day['traffic_light']);

        // Con un solo compañero la comparación no se evalúa.
        $this->wipe();
        $this->dayWithCancels($peerA, '2019-03-04', 20);
        $this->dayWithCancels($cashier, self::DAY, 18, ['capture_error', 'duplicate_charge']);
        $this->assertNotContains('peer_comparison', $this->signalCodes($this->dayOf($admin, $cashier)));

        // Un compañero con menos de 10 boletos en los 7 días no cuenta como compañero.
        $this->wipe();
        $this->dayWithCancels($peerA, '2019-03-04', 20);
        $this->dayWithCancels($peerB, '2019-03-05', 9);
        $this->dayWithCancels($cashier, self::DAY, 18, ['capture_error', 'duplicate_charge']);
        $this->assertNotContains('peer_comparison', $this->signalCodes($this->dayOf($admin, $cashier)));

        // La actividad de un compañero fuera de los 7 días que terminan en el día evaluado no cuenta.
        $this->wipe();
        $this->dayWithCancels($peerA, '2019-03-04', 20);
        $this->dayWithCancels($peerB, '2019-02-27', 18, ['capture_error', 'duplicate_charge']);
        $this->dayWithCancels($cashier, self::DAY, 18, ['capture_error', 'duplicate_charge']);
        $this->assertNotContains('peer_comparison', $this->signalCodes($this->dayOf($admin, $cashier)));

        // Suelo del 5 %: Laura con 4 % (2 de 50) frente a compañeros sin cancelaciones no dispara.
        $this->wipe();
        $this->dayWithCancels($peerA, '2019-03-04', 20);
        $this->dayWithCancels($peerB, '2019-03-05', 20);
        $this->dayWithCancels($cashier, self::DAY, 48, ['capture_error', 'duplicate_charge']);
        $this->assertNotContains('peer_comparison', $this->signalCodes($this->dayOf($admin, $cashier)));

        // Suelo de 2 cancelaciones: 1 de 10 frente a compañeros sin cancelaciones no dispara.
        $this->wipe();
        $this->dayWithCancels($peerA, '2019-03-04', 20);
        $this->dayWithCancels($peerB, '2019-03-05', 20);
        $this->dayWithCancels($cashier, self::DAY, 9, ['capture_error']);
        $this->assertNotContains('peer_comparison', $this->signalCodes($this->dayOf($admin, $cashier)));
    }
}
