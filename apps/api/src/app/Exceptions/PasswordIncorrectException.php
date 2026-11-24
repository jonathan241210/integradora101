<?php

namespace App\Exceptions;

use RuntimeException;

/** La contraseña confirmada no coincide con la del usuario (api-021 CA-07, CA-13). */
class PasswordIncorrectException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('La contraseña no es correcta.');
    }
}
