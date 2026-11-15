<?php

namespace App\Support;

use Illuminate\Pagination\Paginator;

/** Avoids offset overflow on absurd `page` values: out of range is an empty list (api-012 Q4). */
final class PageGuard
{
    public const MAX_PAGE = 100000;

    public static function exceeds(): bool
    {
        return Paginator::resolveCurrentPage() > self::MAX_PAGE;
    }

    public static function empty(int $perPage): Paginator
    {
        return new Paginator([], $perPage, Paginator::resolveCurrentPage(), ['path' => Paginator::resolveCurrentPath()]);
    }
}
