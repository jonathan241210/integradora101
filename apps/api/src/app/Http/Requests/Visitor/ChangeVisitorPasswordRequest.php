<?php

namespace App\Http\Requests\Visitor;

class ChangeVisitorPasswordRequest extends VisitorFormRequest
{
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', app('visitor.password')],
            'password_confirmation' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required' => 'Escribe tu contraseña actual.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres, con letras y números.',
            'password.letters' => 'La contraseña debe tener al menos 8 caracteres, con letras y números.',
            'password.numbers' => 'La contraseña debe tener al menos 8 caracteres, con letras y números.',
            'password.uncompromised' => 'Esa contraseña no es segura. Elige otra.',
            'password.confirmed' => 'La confirmación de la contraseña no coincide.',
        ];
    }
}
