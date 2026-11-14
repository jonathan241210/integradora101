<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;

class ListPublicMemoriesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'limit' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'limit.*' => 'El límite debe ser un número entero entre 1 y 50.',
            'page.*' => 'La página debe ser un número entero mayor o igual a 1.',
        ];
    }

    public function limit(): int
    {
        return (int) ($this->validated('limit') ?? 10);
    }

    public function page(): int
    {
        return (int) ($this->validated('page') ?? 1);
    }
}
