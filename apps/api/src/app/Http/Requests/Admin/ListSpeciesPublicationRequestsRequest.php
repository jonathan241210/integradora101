<?php

namespace App\Http\Requests\Admin;

use App\Enums\SpeciesRequestStatus;
use App\Http\Requests\JsonFormRequest;
use Illuminate\Validation\Rule;

class ListSpeciesPublicationRequestsRequest extends JsonFormRequest
{
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', Rule::in(array_map(fn (SpeciesRequestStatus $s) => $s->value, SpeciesRequestStatus::cases()))],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.in' => 'Estado no válido.',
            'status.string' => 'Estado no válido.',
            'page.integer' => 'Página no válida.',
            'page.min' => 'Página no válida.',
        ];
    }
}
