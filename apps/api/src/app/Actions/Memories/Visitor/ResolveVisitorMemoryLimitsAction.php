<?php

namespace App\Actions\Memories\Visitor;

use App\Enums\MemoryStatus;
use App\Exceptions\OpenMemoryRequestException;
use App\Exceptions\WeeklyMemoryLimitException;
use App\Models\VisitorMemory;
use Carbon\CarbonInterface;

/**
 * Reglas de frecuencia del visitante (api-010 RN-17, RN-18): una petición abierta a la vez y
 * una petición nueva cada 7 días. La usan el envío (CA-23, CA-24) y la lista (meta de CA-06).
 */
class ResolveVisitorMemoryLimitsAction
{
    public const WINDOW_DAYS = 7;

    /** Id de la petición abierta (submitted, in_review o rejected), o null. */
    public function openRequestId(int $visitorId): ?int
    {
        $id = VisitorMemory::query()
            ->where('visitor_id', $visitorId)
            ->whereIn('status', [MemoryStatus::Submitted->value, MemoryStatus::InReview->value, MemoryStatus::Rejected->value])
            ->orderByDesc('id')
            ->value('id');

        return $id === null ? null : (int) $id;
    }

    /** Fecha desde la que puede enviar otra petición nueva, o null si puede ahora. Cuenta también las eliminadas. */
    public function nextSubmissionAt(int $visitorId): ?CarbonInterface
    {
        $last = VisitorMemory::withTrashed()
            ->where('visitor_id', $visitorId)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first(['id', 'created_at']);

        if ($last === null) {
            return null;
        }

        $next = $last->created_at->copy()->addDays(self::WINDOW_DAYS);

        return $next->greaterThan(now()) ? $next : null;
    }

    /** Orden de CA-24: primero la petición abierta y después el límite semanal. */
    public function assertCanSubmit(int $visitorId): void
    {
        $open = $this->openRequestId($visitorId);

        if ($open !== null) {
            throw new OpenMemoryRequestException($open);
        }

        $next = $this->nextSubmissionAt($visitorId);

        if ($next !== null) {
            throw new WeeklyMemoryLimitException($next);
        }
    }
}
