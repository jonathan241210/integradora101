<?php

namespace App\Actions\Memories\Review;

use App\Models\VisitorMemory;
use App\Support\PageGuard;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListMemoriesForReviewAction
{
    /**
     * Moderation list with total (api-012 CA-13). `limit` is the page size (1 to 50, default 10).
     */
    public function execute(?string $status, int $page, int $limit): LengthAwarePaginator
    {
        $query = VisitorMemory::query()
            ->when($status !== null, fn ($query) => $query->where('status', $status))
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        // api-012 Q4: no upper bound, but an absurd page is simply an empty list (avoids offset overflow).
        if (PageGuard::exceeds($page)) {
            return PageGuard::empty($limit, (clone $query)->reorder()->count());
        }

        return $query->paginate($limit, ['*'], 'page', $page);
    }
}
