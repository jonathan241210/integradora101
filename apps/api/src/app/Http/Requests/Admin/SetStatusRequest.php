<?php

namespace App\Http\Requests\Admin;

class SetStatusRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return ['is_active' => ['required', 'boolean']];
    }
}
