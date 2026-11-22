<?php

namespace App\Enums;

/** Señales del semáforo de cancelaciones por cajero y día (api-027 RN-04). Códigos en inglés; etiquetas en español. */
enum CancellationSignal: string
{
    case OverLimitPercent = 'over_limit_percent';
    case LateCancellations = 'late_cancellations';
    case RepeatedOther = 'repeated_other';
    case SameAmount = 'same_amount';
    case LongCancellations = 'long_cancellations';
    case OwnBaseline = 'own_baseline';
    case PeerComparison = 'peer_comparison';

    public function label(): string
    {
        return match ($this) {
            self::OverLimitPercent => 'Porcentaje de cancelación alto',
            self::LateCancellations => 'Cancelaciones cerca del cierre del cajero',
            self::RepeatedOther => 'Motivo «Otro» repetido',
            self::SameAmount => 'Mismo importe repetido',
            self::LongCancellations => 'Cancelaciones más de '.(int) config('arca.cancellation_review.long_cancel_minutes').' min después de la venta',
            self::OwnBaseline => 'Por encima de su promedio',
            self::PeerComparison => 'Por encima de sus compañeros',
        };
    }
}
