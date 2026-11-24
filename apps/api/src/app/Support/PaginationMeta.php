<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/** Common `meta` of paginated lists with total (api-012 CA-13, api-014 CA-42). `has_more` is kept for existing clients. */
final class PaginationMeta
{
    /** @return array{current_page: int, last_page: int, per_page: int, total: int, has_more: bool} */
    public static function from(LengthAwarePaginator $page): array
    {
        return [
            'current_page' => $page->currentPage(),
            'last_page' => $page->lastPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
            'has_more' => $page->hasMorePages(),
        ];
    }
}
