<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;

class ListPublishedSpeciesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $trimmed = [];
        foreach (['habitat', 'name', 'category'] as $key) {
            $value = $this->query($key);
            if (is_string($value)) {
                $trimmed[$key] = trim($value);
            }
        }

        $this->merge($trimmed);
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'habitat' => ['sometimes', 'required', 'string', 'min:1', 'max:150'],
            'name' => ['sometimes', 'required', 'string', 'min:1', 'max:150'],
            'category' => ['sometimes', 'required', 'string', 'in:mammal,bird,reptile,amphibian,fish,invertebrate'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'habitat.*' => 'El hábitat debe tener de 1 a 150 caracteres.',
            'name.*' => 'El nombre debe tener de 1 a 150 caracteres.',
            'category.*' => 'Tipo de animal no válido.',
        ];
    }

    /**
     * @return array{habitat?: string, name?: string, category?: string}
     */
    public function filters(): array
    {
        return $this->validated();
    }
}
