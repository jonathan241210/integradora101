<?php

namespace App\Http\Requests\Visitor;

class LogoutVisitorRequest extends VisitorFormRequest
{
    public function rules(): array
    {
        return [
            'refresh_token' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'refresh_token.required' => 'La sesión no coincide con esta cuenta.',
        ];
    }
}
