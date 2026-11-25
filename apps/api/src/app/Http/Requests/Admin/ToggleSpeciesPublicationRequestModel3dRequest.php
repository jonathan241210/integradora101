<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\JsonFormRequest;

class ToggleSpeciesPublicationRequestModel3dRequest extends JsonFormRequest
{
    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'enabled.required' => 'Indica si el modelo 3D está activo.',
            'enabled.boolean' => 'El estado del modelo 3D debe ser verdadero o falso.',
        ];
    }
}