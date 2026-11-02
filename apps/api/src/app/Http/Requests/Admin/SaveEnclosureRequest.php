<?php

namespace App\Http\Requests\Admin;

use App\Models\Enclosure;

class SaveEnclosureRequest extends AdminFormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('name'))) {
            $this->merge(['name' => trim($this->input('name'))]);
        }
    }

    public function rules(): array
    {
        $ignoreId = $this->route('enclosure');

        return [
            'name' => [
                'required',
                'string',
                'max:100',
                function (string $attribute, mixed $value, \Closure $fail) use ($ignoreId) {
                    $exists = Enclosure::query()
                        ->whereRaw('LOWER(name) = ?', [mb_strtolower((string) $value)])
                        ->when(is_string($ignoreId) && ctype_digit($ignoreId), fn ($q) => $q->where('id', '!=', (int) $ignoreId))
                        ->exists();

                    if ($exists) {
                        $fail('Ya existe un recinto con ese nombre.');
                    }
                },
            ],
        ];
    }
}
