<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator as LengthAwarePaginatorContract;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\Paginator;

/** Avoids offset overflow on absurd `page` values: out of range is an empty list (api-012 Q4). */
final class PageGuard
{
    public const MAX_PAGE = 100000;

    public static function exceeds(?int $page = null): bool
    {
        return ($page ?? Paginator::resolveCurrentPage()) > self::MAX_PAGE;
    }

    /** Empty page that still reports the real `total` (api-012 CA-13, api-014 CA-42). */
    public static function empty(int $perPage, int $total = 0): LengthAwarePaginatorContract
    {
        return new LengthAwarePaginator([], $total, $perPage, Paginator::resolveCurrentPage(), ['path' => Paginator::resolveCurrentPath()]);
    }
}
