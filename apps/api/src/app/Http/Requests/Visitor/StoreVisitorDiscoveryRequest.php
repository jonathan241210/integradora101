<?php

namespace App\Http\Requests\Visitor;

use Illuminate\Foundation\Http\FormRequest;

class StoreVisitorDiscoveryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:255'],
            'scanned_at' => ['required', 'date'],
            'client_scan_id' => ['required', 'uuid'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.required' => 'El código es obligatorio.',
            'scanned_at.required' => 'La hora del escaneo es obligatoria.',
            'scanned_at.date' => 'La hora del escaneo no es válida.',
            'client_scan_id.required' => 'El identificador del escaneo es obligatorio.',
            'client_scan_id.uuid' => 'El identificador del escaneo no es válido.',
        ];
    }
}
