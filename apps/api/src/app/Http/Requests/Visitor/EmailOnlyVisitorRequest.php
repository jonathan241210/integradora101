<?php

namespace App\Http\Requests\Visitor;

class EmailOnlyVisitorRequest extends VisitorFormRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Escribe tu correo.',
            'email.email' => 'Escribe un correo válido.',
        ];
    }
}
