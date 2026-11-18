<?php

namespace App\Http\Requests\Visitor;

class DeleteVisitorPushTokenRequest extends VisitorFormRequest
{
    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'token.required' => 'Falta el identificador del teléfono.',
        ];
    }
}
