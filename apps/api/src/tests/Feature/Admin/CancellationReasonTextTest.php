<?php

namespace Tests\Feature\Admin;

/** api-027: porqué, qué hacer y textos por nivel. */
class CancellationReasonTextTest extends CancellationReviewTestCase
{
    /** CA-13 cancellation-review-signals */
    public function test_ca13_reason_sentence_lists_signals_and_counts(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura', 'last_name' => 'Cruz']);
        $this->wipe();

        // Histórico de 4 días de 25 boletos con 3 cancelaciones en total (B = 3 %).
        foreach (['2019-02-18' => 1, '2019-02-19' => 1, '2019-02-20' => 1, '2019-02-21' => 0] as $date => $cancels) {
            $this->dayWithCancels($cashier, $date, 25 - $cancels, array_fill(0, $cancels, 'capture_error'));
        }
        // Día evaluado: 25 boletos, 4 cancelados (16 %), dos con motivo «Otro», importes distintos y tempranas.
        $this->dayWithCancels($cashier, self::DAY, 21, ['other', 'other', 'capture_error', 'duplicate_charge']);

        $day = $this->dayOf($admin, $cashier);
        $this->assertSame('attention', $day['traffic_light']);
        $this->assertSame(['over_limit_percent', 'repeated_other', 'own_baseline'], $this->signalCodes($day));
        // Revisión 2026-11-21 (c): la frase usa etiquetas claras y el conteo de cada señal.
        $this->assertSame(
            'Se activaron 3 señales: Por encima de su promedio (4 boletos); Motivo «Otro» repetido (2 boletos); Porcentaje de cancelación alto (4 boletos).',
            $day['reason_sentence'],
        );

        $reasons = collect($day['reasons'])->keyBy('code');
        $this->assertSame(4, $reasons['over_limit_percent']['count']);
        $this->assertSame('16 % de 25 boletos', $reasons['over_limit_percent']['detail']);
        $this->assertSame(2, $reasons['repeated_other']['count']);
        $this->assertSame('16 % frente a 3 % habitual en 4 semanas', $reasons['own_baseline']['detail']);
        $this->assertNotEmpty($reasons['own_baseline']['label']);
    }

    /** CA-14 cancellation-review-signals */
    public function test_ca14_action_texts_per_level_and_no_physical_ticket_request(): void
    {
        $admin = $this->createAccount('admin');
        $normal = $this->createAccount('cashier', true, ['first_name' => 'Ana']);
        $review = $this->createAccount('cashier', true, ['first_name' => 'Berta']);
        $attention = $this->createAccount('cashier', true, ['first_name' => 'Carla']);
        $this->wipe();
        $this->normalDay($normal, '2019-03-04');
        $this->reviewDay($review, '2019-03-05');
        $this->attentionDay($attention, '2019-03-06');
        $this->completed($normal, '2019-03-07', 1);
        $this->insertSale(null, $this->utc('2019-03-08', '10:00:00')->format('Y-m-d H:i:s'));

        $report = $this->report($admin, self::RANGE);
        $actions = [
            'normal' => 'Sin acción: no hay señales que revisar.',
            'review' => 'Revisa las cancelaciones marcadas y pide al cajero que explique cada una.',
            'attention' => 'Compara el neto con el dinero entregado y pide al cajero que explique las cancelaciones marcadas.',
        ];
        $this->assertSame($actions['normal'], $this->cashierDay($report, $normal->id, '2019-03-04')['action']);
        $this->assertSame($actions['review'], $this->cashierDay($report, $review->id, '2019-03-05')['action']);
        $this->assertSame($actions['attention'], $this->cashierDay($report, $attention->id, '2019-03-06')['action']);

        foreach ($report['reconciliation']['cashier_days'] as $row) {
            $this->assertDoesNotMatchRegularExpression('/f[ií]sic/iu', $row['action']);
            $this->assertDoesNotMatchRegularExpression('/boletos? cancelados? f/iu', $row['action']);
        }
    }
}
