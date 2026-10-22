<?php

namespace App\Http\Requests\Visitor;

class VerifyVisitorEmailRequest extends VisitorFormRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'digits:6'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.digits' => 'El código no es válido.',
            'code.required' => 'El código no es válido.',
        ];
    }
}
