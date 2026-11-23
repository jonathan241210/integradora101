<?php

namespace App\Http\Requests\Admin;

/**
 * Sin reglas de cuerpo: resuelve la cuenta (404) y rechaza las cuentas admin (403) antes de operar (api-023 CA-11, CA-14).
 */
class ResetStaffTwoFactorRequest extends ManagedStaffAccountRequest
{
    public function rules(): array
    {
        return [];
    }
}
