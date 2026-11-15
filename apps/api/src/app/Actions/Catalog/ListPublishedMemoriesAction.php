<?php

namespace App\Actions\Catalog;

use App\Models\VisitorMemory;
use Illuminate\Database\Eloquent\Collection;

class ListPublishedMemoriesAction
{
    private const MAX_PAGE = 100000;

    /**
     * Momentos aceptados y vigentes (api-012 RN-03). Solo lectura.
     *
     * @return array{items: Collection<int, VisitorMemory>, meta: array{page: int, limit: int, has_more: bool}}
     */
    public function execute(int $limit = 10, int $page = 1): array
    {
        // api-012 Q4: no upper bound, but an absurd page is simply an empty list (avoids offset overflow).
        if ($page > self::MAX_PAGE) {
            return ['items' => new Collection, 'meta' => ['page' => $page, 'limit' => $limit, 'has_more' => false]];
        }

        $rows = VisitorMemory::query()
            ->publiclyVisible(now())
            ->select(['id', 'opinion', 'published_image_path', 'published_at'])
            ->orderByDesc('published_at')
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
