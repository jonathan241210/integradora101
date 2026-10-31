<?php

namespace App\Http\Requests\Admin;

class SetStaffAccountStatusRequest extends ManagedStaffAccountRequest
{
    public function rules(): array
    {
        return ['is_active' => ['required', 'boolean']];
    }
}
