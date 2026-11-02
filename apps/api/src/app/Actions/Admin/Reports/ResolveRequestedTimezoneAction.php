<?php

namespace App\Actions\Admin\Reports;

use DateTimeZone;

/**
 * Zona horaria del dispositivo que consulta (RN-14). Una zona ausente o inválida no es error:
 * se usa la zona por defecto.
 */
class ResolveRequestedTimezoneAction
{
    public function execute(mixed $requested): string
    {
        // Acepta alias del navegador (Asia/Calcutta, Europe/Kiev); rechaza abreviaturas (EST) y desfases (+05:00).
        if (is_string($requested) && $requested !== '' && ($requested === 'UTC' || str_contains($requested, '/'))
            && in_array($requested, DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC), true)) {
            return $requested;
        }

        return (string) config('arca.report_timezone');
    }
}
