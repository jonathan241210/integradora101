<?php

namespace App\Http\Requests\Staff;

use App\Models\Animal;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAnimalStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('reason'))) {
            $this->merge(['reason' => trim($this->input('reason'))]);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $stayStatuses = ['Permanente', 'Cuarentena_Ingreso', 'Resguardo_Profepa', 'Liberado', 'Trasladado'];

        return [
            'stay_status' => ['sometimes', 'required', 'string', Rule::in($stayStatuses)],
            'can_receive_visits' => ['sometimes', 'required', 'boolean'],
            'reason' => [
                Rule::requiredIf(fn (): bool => $this->has('stay_status')),
                'nullable',
                'string',
                'max:500',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'stay_status.required' => 'Selecciona un estatus de estancia.',
            'stay_status.in' => 'El estatus de estancia no es válido.',
            'can_receive_visits.required' => 'Indica si el animal puede recibir visitas.',
            'can_receive_visits.boolean' => 'Selecciona Sí o No para las visitas.',
            'reason.required' => 'Indica el motivo del cambio de estatus.',
            'reason.max' => 'El motivo no debe exceder 500 caracteres.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if (! $this->has('stay_status') && ! $this->has('can_receive_visits')) {
                $validator->errors()->add('stay_status', 'Debes enviar al menos el estatus de estancia o el permiso de visitas.');
            }
        });
    }

    public function animal(): Animal
    {
        /** @var Animal $animal */
        $animal = $this->route('animal');

        return $animal;
    }
}