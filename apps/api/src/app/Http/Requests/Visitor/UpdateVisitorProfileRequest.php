<?php

namespace App\Http\Requests\Visitor;

use Illuminate\Validation\Rule;

class UpdateVisitorProfileRequest extends VisitorFormRequest
{
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'nickname' => ['required', 'string', 'max:100'],
            'avatar_code' => ['required', 'string', Rule::in(config('visitor.avatar_codes'))],
        ];
    }

    public function messages(): array
    {
        return [
            'first_name.required' => 'Escribe tu nombre.',
            'nickname.required' => 'Escribe tu apodo.',
            'avatar_code.in' => 'Elige un avatar del catálogo.',
        ];
    }
}
