<?php

namespace App\Http\Requests\Visitor;

class LoginVisitorRequest extends VisitorFormRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Escribe tu correo.',
            'password.required' => 'Escribe tu contraseña.',
            'device_name.required' => 'Indica el nombre del dispositivo.',
        ];
    }
}
