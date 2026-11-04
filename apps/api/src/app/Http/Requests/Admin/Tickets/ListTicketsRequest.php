<?php

namespace App\Http\Requests\Admin\Tickets;

use App\Http\Requests\Admin\AdminFormRequest;

class ListTicketsRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'folio' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'in:completed,cancelled'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'folio.integer' => 'El folio debe ser un número entero.',
            'folio.min' => 'El folio debe ser un número positivo.',
            'status.in' => 'El estado debe ser «completed» o «cancelled».',
            'from.date_format' => 'La fecha inicial debe tener el formato AAAA-MM-DD.',
            'to.date_format' => 'La fecha final debe tener el formato AAAA-MM-DD.',
            'to.after_or_equal' => 'La fecha final no puede ser anterior a la inicial.',
            'page.integer' => 'La página debe ser un número entero.',
            'page.min' => 'La página debe ser mayor que cero.',
            'per_page.integer' => 'El tamaño de página debe ser un número entero.',
            'per_page.min' => 'El tamaño de página debe ser mayor que cero.',
            'per_page.max' => 'El tamaño de página no puede superar 100.',
        ];
    }
}
