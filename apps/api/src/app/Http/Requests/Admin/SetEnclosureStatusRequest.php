<?php

namespace App\Http\Requests\Admin;

class SetEnclosureStatusRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'is_active' => [
                'required',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_bool($value)) {
                        $fail('El estado del recinto debe ser verdadero o falso.');
                    }
                },
            ],
        ];
    }

    public function messages(): array
    {
        return ['is_active.required' => 'El estado del recinto debe ser verdadero o falso.'];
    }
}
