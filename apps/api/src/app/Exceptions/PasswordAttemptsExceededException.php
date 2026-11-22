<?php

namespace App\Exceptions;

use RuntimeException;

/** Bloqueo activo por contraseñas incorrectas (api-021 CA-27). */
class PasswordAttemptsExceededException extends RuntimeException
{
    public function __construct(public readonly int $seconds)
    {
        parent::__construct(__('auth.throttle', ['seconds' => $seconds]));
    }
}
