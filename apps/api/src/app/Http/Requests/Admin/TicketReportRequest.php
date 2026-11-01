<?php

namespace App\Http\Requests\Admin;

class TicketReportRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'period' => ['required', 'in:week,month,custom'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * Filtros validados más `timezone` (RN-14): se lee sin regla de validación para que
     * una zona inválida nunca produzca 422; la Action la resuelve.
     */
    public function reportInput(): array
    {
        return $this->validated() + ['timezone' => $this->input('timezone')];
    }
}
