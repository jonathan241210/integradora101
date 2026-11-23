<?php

namespace App\Enums;

/** Nivel del semáforo de un cajero y día (api-027 CA-11). */
enum CancellationReviewLevel: string
{
    case Normal = 'normal';
    case Review = 'review';
    case Attention = 'attention';

    /** `k` señales: 0 Normal, 1 Revisar, `attentionMin` o más Atención (RN-05). */
    public static function fromSignalCount(int $count, ?int $attentionMin = null): self
    {
        $attentionMin ??= (int) config('arca.cancellation_review.attention_min_signals');

        return match (true) {
            $count <= 0 => self::Normal,
            $count >= max(2, $attentionMin) => self::Attention,
            default => self::Review,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Normal => 'Normal',
            self::Review => 'Revisar',
            self::Attention => 'Atención',
        };
    }

    /** Texto de «qué hacer» (RN-05). No pide boletos físicos (decisión 1 de 2026-11-21). */
    public function action(): string
    {
        return match ($this) {
            self::Normal => 'Sin acción: no hay señales que revisar.',
            self::Review => 'Revisa las cancelaciones marcadas y pide al cajero que explique cada una.',
            self::Attention => 'Compara el neto con el dinero entregado y pide al cajero que explique las cancelaciones marcadas.',
        };
    }
}
