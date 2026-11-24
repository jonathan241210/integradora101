<?php

namespace App\Actions\Console\AdminAccounts;

/**
 * Motivo obligatorio de los comandos de consola que cambian datos (api-023 RN-07): texto recortado de al menos
 * 10 caracteres, sin valor por defecto.
 */
class ValidateConsoleReasonAction
{
    public const MIN_LENGTH = 10;

    public const MESSAGE = 'Indica el motivo del cambio.';

    public function execute(mixed $reason): ?string
    {
        if (! is_string($reason)) {
            return null;
        }

        $reason = trim($reason);

        return mb_strlen($reason) >= self::MIN_LENGTH ? mb_substr($reason, 0, 500) : null;
    }
}
