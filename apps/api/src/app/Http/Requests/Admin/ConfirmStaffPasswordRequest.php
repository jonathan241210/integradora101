<?php

namespace App\Http\Requests\Admin;

class ConfirmStaffPasswordRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return ['password' => ['required', 'string']];
    }
}
