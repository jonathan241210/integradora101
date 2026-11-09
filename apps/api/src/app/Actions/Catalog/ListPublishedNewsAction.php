<?php

namespace App\Actions\Catalog;

use App\Models\News;
use Illuminate\Database\Eloquent\Collection;

class ListPublishedNewsAction
{
    /**
     * @return array{items: Collection<int, News>, meta: array{page: int, limit: int, has_more: bool}}
     */
    public function execute(int $limit = 10, int $page = 1): array
    {
        $rows = News::query()
            ->publicVisible()
            ->orderByDesc('published_date')
            ->orderByDesc('id')
            ->offset(($page - 1) * $limit)
            ->limit($limit + 1)
            ->get();

        $hasMore = $rows->count() > $limit;

        return [
            'items' => $rows->take($limit)->values(),
            'meta' => ['page' => $page, 'limit' => $limit, 'has_more' => $hasMore],
        ];
    }
}
