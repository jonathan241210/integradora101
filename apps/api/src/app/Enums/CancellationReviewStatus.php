<?php

namespace App\Enums;

/** Decisión de revisión de un cajero y día (api-027 RN-08). */
enum CancellationReviewStatus: string
{
    case ReviewedOk = 'reviewed_ok';
    case ClarificationRequired = 'clarification_required';

    public function label(): string
    {
        return match ($this) {
            self::ReviewedOk => 'Revisado: todo en orden',
            self::ClarificationRequired => 'Requiere aclaración',
        };
    }
}
