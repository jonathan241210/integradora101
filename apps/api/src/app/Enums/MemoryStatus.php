<?php

namespace App\Enums;

/** Estados persistidos de una petición de «Momentos para recordar» (api-010 RN-01). */
enum MemoryStatus: string
{
    case Submitted = 'submitted';
    case InReview = 'in_review';
    case Accepted = 'accepted';
    case Rejected = 'rejected';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
