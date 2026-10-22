<?php

namespace App\Http\Requests\Visitor;

use Closure;
use Illuminate\Validation\Rule;

class RegisterVisitorRequest extends VisitorFormRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255', Rule::unique('visitors', 'email')],
            'password' => ['required', 'string', 'confirmed', app('visitor.password')],
            'password_confirmation' => ['required', 'string'],
            'first_name' => ['required', 'string', 'max:255'],
            'nickname' => ['required', 'string', 'max:100'],
            'avatar_code' => ['required', 'string', Rule::in(config('visitor.avatar_codes'))],
            'is_adult' => ['required', function (string $attribute, mixed $value, Closure $fail): void {
                if ($value !== true) {
                    $fail('Debes ser mayor de 18 años.');
                }
            }],
            'privacy_notice_version' => ['required', 'string', Rule::in([config('visitor.privacy_notice_version')])],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'Ese correo ya está registrado.',
            'email.required' => 'Escribe tu correo.',
            'email.email' => 'Escribe un correo válido.',
            'password.required' => 'La contraseña debe tener al menos 8 caracteres, con letras y números.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres, con letras y números.',
            'password.letters' => 'La contraseña debe tener al menos 8 caracteres, con letras y números.',
            'password.numbers' => 'La contraseña debe tener al menos 8 caracteres, con letras y números.',
            'password.uncompromised' => 'Esa contraseña no es segura. Elige otra.',
            'password.confirmed' => 'La confirmación de la contraseña no coincide.',
            'first_name.required' => 'Escribe tu nombre.',
            'nickname.required' => 'Escribe tu apodo.',
            'avatar_code.in' => 'Elige un avatar del catálogo.',
            'privacy_notice_version.in' => 'Debes aceptar el aviso de privacidad vigente.',
        ];
    }
}
