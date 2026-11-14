<?php

namespace App\Enums;

/** Campos que el revisor puede marcar al rechazar (api-010 RN-20). */
enum MemoryRejectedField: string
{
    case Image = 'image';
    case Content = 'content';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
