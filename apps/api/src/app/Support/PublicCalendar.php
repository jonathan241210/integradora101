<?php

namespace App\Support;

class PublicCalendar
{
    /**
     * Única fuente de "hoy" para la visibilidad pública (api-011 RN-14).
     */
    public static function today(): string
    {
        return BusinessTimezone::today();
    }
}
