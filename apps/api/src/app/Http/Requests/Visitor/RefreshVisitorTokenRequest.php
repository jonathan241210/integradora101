<?php

namespace App\Http\Requests\Visitor;

class RefreshVisitorTokenRequest extends VisitorFormRequest
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
            'refresh_token.required' => 'La sesión ya no es válida. Vuelve a entrar.',
        ];
    }
}
