<?php

namespace App\Actions\Memories\Visitor;

use App\Models\Visitor;
use App\Models\VisitorMemory;
use Illuminate\Database\Eloquent\Collection;

class ListVisitorMemoriesAction
{
    private const LIMIT = 50;

    public function __construct(private readonly ResolveVisitorMemoryLimitsAction $limits) {}

    /**
     * Solo las peticiones del visitante, de la más reciente a la más antigua, máximo 50 (RN-11).
     *
     * @return array{items: Collection<int, VisitorMemory>, meta: array{can_submit: bool, next_submission_at: ?string, open_request_id: ?int}}
     */
    public function execute(Visitor $visitor): array
    {
        $items = VisitorMemory::query()
            ->where('visitor_id', $visitor->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(self::LIMIT)
            ->get();

        $open = $this->limits->openRequestId($visitor->id);
        $next = $this->limits->nextSubmissionAt($visitor->id);

        return [
            'items' => $items,
            'meta' => [
                'can_submit' => $open === null && $next === null,
                'next_submission_at' => $next?->copy()->utc()->toIso8601String(),
                'open_request_id' => $open,
            ],
        ];
    }
}
