<?php

namespace App\Http\Requests\Visitor;

class DeleteVisitorAccountRequest extends VisitorFormRequest
{
    public function rules(): array
    {
        return [
            'password' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'password.required' => 'Escribe tu contraseña.',
        ];
    }
}
