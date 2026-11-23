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

    /** Filtros validados. El `timezone` del cliente se ignora (api-025 RN-04): no tiene regla ni produce 422. */
    public function reportInput(): array
    {
        return $this->validated();
    }
}
