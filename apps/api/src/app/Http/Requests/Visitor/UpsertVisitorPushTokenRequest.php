<?php

namespace App\Http\Requests\Visitor;

class UpsertVisitorPushTokenRequest extends VisitorFormRequest
{
    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'max:255'],
            'platform' => ['required', 'string', 'in:android'],
        ];
    }

    public function messages(): array
    {
        return [
            'token.required' => 'Falta el identificador del teléfono.',
            'platform.in' => 'Solo se aceptan teléfonos Android.',
            'platform.required' => 'Indica la plataforma del teléfono.',
        ];
    }
}
