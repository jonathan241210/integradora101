<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\JsonFormRequest;

class RejectSpeciesPublicationRequest extends JsonFormRequest
{
    public function rules(): array
    {
        return [
            'rejection_reason' => ['required', 'string', 'min:1', 'max:500'],
        ];
    }

    public function messages(): array
    {
        $message = 'Motivo requerido (1-500 caracteres).';

        return [
            'rejection_reason.required' => $message,
            'rejection_reason.string' => $message,
            'rejection_reason.min' => $message,
            'rejection_reason.max' => $message,
        ];
    }
}
