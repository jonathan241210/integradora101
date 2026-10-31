<?php

namespace App\Http\Requests\Admin;

use Illuminate\Validation\Rules\Password;

class ResetStaffPasswordRequest extends ManagedStaffAccountRequest
{
    public function rules(): array
    {
        return ['password' => ['required', 'string', Password::defaults()]];
    }
}
