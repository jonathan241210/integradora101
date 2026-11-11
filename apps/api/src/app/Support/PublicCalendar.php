<?php

namespace App\Support;

use Carbon\CarbonImmutable;

class PublicCalendar
{
    /**
     * Única fuente de "hoy" para la visibilidad pública (api-011 RN-14).
     */
    public static function today(): string
    {
        return CarbonImmutable::now(config('arca.public_timezone'))->toDateString();
    }
}
