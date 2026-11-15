<?php

namespace App\Http\Requests\Admin;

use App\Enums\SpeciesCategory;
use App\Http\Requests\JsonFormRequest;
use Illuminate\Validation\Rule;

class ListPublishedSpeciesRequest extends JsonFormRequest
{
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', Rule::in(['published', 'unpublished'])],
            'category' => ['nullable', 'string', Rule::in(SpeciesCategory::values())],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.in' => 'Estado no válido.',
            'status.string' => 'Estado no válido.',
            'category.in' => 'Tipo de animal no válido.',
            'category.string' => 'Tipo de animal no válido.',
            'page.integer' => 'Página no válida.',
            'page.min' => 'Página no válida.',
        ];
    }
}
