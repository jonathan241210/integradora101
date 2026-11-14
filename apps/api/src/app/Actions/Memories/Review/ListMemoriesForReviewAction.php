<?php

namespace App\Actions\Memories\Review;

use App\Models\VisitorMemory;
use Illuminate\Database\Eloquent\Collection;

class ListMemoriesForReviewAction
{
    private const MAX_PAGE = 100000;

    /**
     * @return array{items: Collection<int, VisitorMemory>, meta: array{page: int, limit: int, has_more: bool}}
     */
    public function execute(?string $status, int $page, int $limit): array
    {
        // api-012 Q4: no upper bound, but an absurd page is simply an empty list (avoids offset overflow).
        if ($page > self::MAX_PAGE) {
            return ['items' => new Collection, 'meta' => ['page' => $page, 'limit' => $limit, 'has_more' => false]];
        }

        $rows = VisitorMemory::query()
            ->when($status !== null, fn ($query) => $query->where('status', $status))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->offset(($page - 1) * $limit)
            ->limit($limit + 1)
            ->get();

        return [
            'items' => $rows->take($limit)->values(),
            'meta' => ['page' => $page, 'limit' => $limit, 'has_more' => $rows->count() > $limit],
        ];
    }
}
