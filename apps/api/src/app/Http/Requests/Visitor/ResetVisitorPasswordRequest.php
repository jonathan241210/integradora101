<?php

namespace App\Http\Requests\Visitor;

class ResetVisitorPasswordRequest extends VisitorFormRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'digits:6'],
            'password' => ['required', 'string', 'confirmed', app('visitor.password')],
            'password_confirmation' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.digits' => 'El código no es válido.',
            'code.required' => 'El código no es válido.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres, con letras y números.',
            'password.letters' => 'La contraseña debe tener al menos 8 caracteres, con letras y números.',
            'password.numbers' => 'La contraseña debe tener al menos 8 caracteres, con letras y números.',
            'password.uncompromised' => 'Esa contraseña no es segura. Elige otra.',
            'password.confirmed' => 'La confirmación de la contraseña no coincide.',
        ];
    }
}
