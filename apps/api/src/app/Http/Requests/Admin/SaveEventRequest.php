<?php

namespace App\Http\Requests\Admin;

use Illuminate\Validation\Validator;

class SaveEventRequest extends AdminFormRequest
{
    private const TIME = '/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/';

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:5000'],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'start_time' => ['nullable', 'regex:'.self::TIME],
            'end_time' => ['nullable', 'regex:'.self::TIME],
            'location' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'start_time.regex' => 'El campo hora de inicio no tiene un formato de hora válido (HH:MM).',
            'end_time.regex' => 'El campo hora de fin no tiene un formato de hora válido (HH:MM).',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $start = $this->input('start_time');
            $end = $this->input('end_time');
            $startDate = $this->input('start_date');
            $endDate = $this->input('end_date');

            if ($start && $end && ($endDate === null || $endDate === $startDate)
                && strtotime($end) <= strtotime($start)) {
                $validator->errors()->add('end_time', 'La hora de fin debe ser posterior a la hora de inicio.');
            }
        }];
    }
}
