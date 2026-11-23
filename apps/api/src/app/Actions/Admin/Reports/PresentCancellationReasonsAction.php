<?php

namespace App\Actions\Admin\Reports;

use App\Enums\CancellationReviewLevel;
use App\Enums\CancellationSignal;

/**
 * Única fuente de los textos del semáforo: porqué (`reasons[]`, `reason_sentence`), qué hacer (`action`) y
 * leyenda (api-027 RN-05, CA-13, CA-14, CA-26). Recibe hechos ya calculados; no calcula señales.
 */
class PresentCancellationReasonsAction
{
    public const DISCLAIMER = 'Una alerta no prueba nada: solo indica qué revisar.';

    public const NO_CASHIER_ACTION = 'No aplica: el día no tiene cajero registrado.';

    /** Orden de las frases en la oración: comparaciones primero y el porcentaje del día al final. */
    private const SENTENCE_ORDER = [
        CancellationSignal::OwnBaseline,
        CancellationSignal::PeerComparison,
        CancellationSignal::RepeatedOther,
        CancellationSignal::SameAmount,
        CancellationSignal::LateCancellations,
        CancellationSignal::LongCancellations,
        CancellationSignal::OverLimitPercent,
    ];

    /**
     * @param  array<string, array<string, mixed>>  $signals  hechos por código de señal (solo las disparadas)
     * @return array{reasons: list<array>, reason_sentence: ?string, action: string}
     */
    public function execute(CancellationReviewLevel $level, array $signals): array
    {
        $reasons = [];
        foreach (CancellationSignal::cases() as $signal) {
            if (isset($signals[$signal->value])) {
                $facts = $signals[$signal->value];
                $reasons[] = [
                    'code' => $signal->value,
                    'label' => $signal->label(),
                    'count' => (int) $facts['count'],
                    'detail' => $this->detail($signal, $facts),
                    'folios' => array_values($facts['folios'] ?? []),
                ];
            }
        }

        // Frase clara (api-027 rev. 2026-11-21 c): «Se activaron N señales: <etiqueta> (<n> boletos); …».
        $phrases = [];
        foreach (self::SENTENCE_ORDER as $signal) {
            if (isset($signals[$signal->value])) {
                $phrases[] = $signal->label().' ('.$this->tickets((int) $signals[$signal->value]['count']).')';
            }
        }

        $sentence = null;
        if ($phrases !== []) {
            $k = count($phrases);
            $sentence = ($k === 1 ? 'Se activó 1 señal: ' : "Se activaron {$k} señales: ").implode('; ', $phrases).'.';
        }

        return ['reasons' => $reasons, 'reason_sentence' => $sentence, 'action' => $level->action()];
    }

    /** @return array{legend: list<array>, levels: list<array>, disclaimer: string} */
    public function legend(): array
    {
        $c = config('arca.cancellation_review');
        $pct = fn ($v): string => self::percent((float) $v);
        $minCancelled = (int) $c['comparison_min_cancelled'];

        $items = [
            CancellationSignal::OverLimitPercent->value => [
                'Se cancelaron demasiados boletos en el día frente a lo vendido.',
                "Más de {$pct($c['over_limit_percent'])} % cancelado en el día, con al menos {$c['daily_min_sold_tickets']} boletos vendidos.",
            ],
            CancellationSignal::LateCancellations->value => [
                'Cancelaciones hechas justo antes de la última venta del cajero ese día.',
                "{$c['late_min_count']} o más cancelaciones en los {$c['late_window_minutes']} minutos previos a la última venta del cajero ese día.",
            ],
            CancellationSignal::RepeatedOther->value => [
                'El motivo «Otro» se repite en el mismo día.',
                "{$c['repeated_other_min']} o más cancelaciones con motivo «Otro» el mismo día.",
            ],
            CancellationSignal::SameAmount->value => [
                'Varias cancelaciones del mismo importe en el mismo día.',
                "{$c['same_amount_min']} o más cancelaciones con el mismo importe el mismo día.",
            ],
            CancellationSignal::LongCancellations->value => [
                'Cancelaciones hechas mucho después de la venta.',
                "{$c['long_cancel_min_count']} o más cancelaciones hechas más de {$c['long_cancel_minutes']} minutos después de la venta.",
            ],
            CancellationSignal::OwnBaseline->value => [
                'El porcentaje del día es mucho mayor que el habitual del propio cajero.',
                "{$c['baseline_multiplier']} veces o más su porcentaje de las últimas {$c['baseline_weeks']} semanas (con al menos {$c['baseline_min_active_days']} días con actividad), al menos {$pct($c['comparison_min_percent'])} % y {$minCancelled} cancelaciones.",
            ],
            CancellationSignal::PeerComparison->value => [
                'El porcentaje del día es mucho mayor que el de los demás cajeros.',
                "{$c['baseline_multiplier']} veces o más la mediana de sus compañeros en los últimos {$c['peer_window_days']} días (al menos {$c['peer_min_cashiers']} compañeros con {$c['peer_min_sold_tickets']} boletos), al menos {$pct($c['comparison_min_percent'])} % y {$minCancelled} cancelaciones.",
            ],
        ];

        $legend = [];
        foreach (CancellationSignal::cases() as $signal) {
            [$explanation, $limit] = $items[$signal->value];
            $legend[] = ['code' => $signal->value, 'label' => $signal->label(), 'explanation' => $explanation, 'limit' => $limit];
        }

        return ['legend' => $legend, 'levels' => $this->levels(), 'disclaimer' => self::DISCLAIMER];
    }

    /**
     * Niveles del semáforo con su condición, calculada de `attention_min_signals` (api-027 CA-11).
     *
     * @return list<array{code: string, label: string, condition: string}>
     */
    public function levels(): array
    {
        $attentionMin = max(2, (int) config('arca.cancellation_review.attention_min_signals'));
        $review = $attentionMin - 1 === 1 ? '1 señal' : "de 1 a {$this->signalCount($attentionMin - 1)}";

        return [
            ['code' => CancellationReviewLevel::Normal->value, 'label' => CancellationReviewLevel::Normal->label(), 'condition' => '0 señales'],
            ['code' => CancellationReviewLevel::Review->value, 'label' => CancellationReviewLevel::Review->label(), 'condition' => $review],
            ['code' => CancellationReviewLevel::Attention->value, 'label' => CancellationReviewLevel::Attention->label(), 'condition' => "{$attentionMin} o más señales"],
        ];
    }

    private function signalCount(int $n): string
    {
        return $n === 1 ? '1 señal' : "{$n} señales";
    }

    /** Porcentaje con hasta dos decimales, coma decimal y sin ceros sobrantes (RN-03). */
    public static function percent(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, ',', ''), '0'), ',');
    }

    private function cancellations(int $n): string
    {
        return $n === 1 ? '1 cancelación' : "{$n} cancelaciones";
    }

    private function tickets(int $n): string
    {
        return $n === 1 ? '1 boleto' : "{$n} boletos";
    }

    private function detail(CancellationSignal $signal, array $f): string
    {
        $n = (int) $f['count'];

        return match ($signal) {
            CancellationSignal::OverLimitPercent => self::percent($f['percent']).' % de '.$this->tickets((int) $f['gross']),
            CancellationSignal::LateCancellations => $this->cancellations($n)." en los {$f['minutes']} minutos previos a la última venta",
            CancellationSignal::RepeatedOther => $this->cancellations($n).' con motivo Otro',
            CancellationSignal::SameAmount => $this->cancellations($n).' con el mismo importe',
            CancellationSignal::LongCancellations => $this->cancellations($n)." de más de {$f['minutes']} minutos",
            CancellationSignal::OwnBaseline => self::percent($f['percent']).' % frente a '.self::percent($f['reference'])." % habitual en {$f['weeks']} semanas",
            CancellationSignal::PeerComparison => self::percent($f['percent']).' % frente a '.self::percent($f['reference'])." % de la mediana de compañeros en {$f['days']} días",
        };
    }
}
