<?php

namespace App\Http\Requests\Admin;

use App\Enums\MemoryRejectedField;
use Closure;

class RejectMemoryRequest extends AdminFormRequest
{
    private const FIELDS_MESSAGE = 'Indica qué falló: la foto, la opinión o ambas.';

    public function rules(): array
    {
        return [
            'rejection_reason' => ['required', 'string', 'min:1', 'max:500'],
            'rejected_fields' => [
                'required', 'array', 'min:1', 'max:2',
                function (string $attribute, mixed $value, Closure $fail): void {
                    $allowed = MemoryRejectedField::values();
                    $valid = is_array($value)
                        && count($value) === count(array_unique($value, SORT_REGULAR))
                        && collect($value)->every(fn ($item) => is_string($item) && in_array($item, $allowed, true));

                    if (! $valid) {
                        $fail(self::FIELDS_MESSAGE);
                    }
                },
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'rejection_reason.required' => 'Motivo requerido (1-500 caracteres).',
            'rejection_reason.string' => 'Motivo requerido (1-500 caracteres).',
            'rejection_reason.min' => 'Motivo requerido (1-500 caracteres).',
            'rejection_reason.max' => 'Motivo requerido (1-500 caracteres).',
            'rejected_fields.required' => self::FIELDS_MESSAGE,
            'rejected_fields.array' => self::FIELDS_MESSAGE,
            'rejected_fields.min' => self::FIELDS_MESSAGE,
            'rejected_fields.max' => self::FIELDS_MESSAGE,
        ];
    }

    /** @return list<string> */
    public function rejectedFields(): array
    {
        return array_values($this->validated('rejected_fields'));
    }
}
