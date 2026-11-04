<?php

namespace App\Http\Requests\Admin\Tickets;

use App\Http\Requests\Admin\AdminFormRequest;
use Illuminate\Validation\Validator;

class RegisterTicketSaleRequest extends AdminFormRequest
{
    /** Tope de boletos por tipo en una venta (api-009 CA-42, RN-29). */
    public const MAX_PER_TYPE = 100;

    public function rules(): array
    {
        return [
            // `integer:strict`: solo enteros JSON reales (rechaza booleanos, 1.5, 2.0 y "2"); `bail` evita
            // evaluar el tope sobre un valor que no es entero (RN-29).
            'adult_quantity' => ['bail', 'required', 'integer:strict', 'min:0', 'max:'.self::MAX_PER_TYPE],
            'child_quantity' => ['bail', 'required', 'integer:strict', 'min:0', 'max:'.self::MAX_PER_TYPE],
        ];
    }

    public function messages(): array
    {
        return [
            'adult_quantity.required' => 'Indica la cantidad de boletos de adulto.',
            'adult_quantity.integer' => 'La cantidad de boletos de adulto debe ser un número entero.',
            'adult_quantity.min' => 'La cantidad de boletos de adulto no puede ser negativa.',
            'adult_quantity.max' => __('validation.ticket_quantity_max'),
            'child_quantity.required' => 'Indica la cantidad de boletos de niño.',
            'child_quantity.integer' => 'La cantidad de boletos de niño debe ser un número entero.',
            'child_quantity.min' => 'La cantidad de boletos de niño no puede ser negativa.',
            'child_quantity.max' => __('validation.ticket_quantity_max'),
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }
                if ((int) $this->input('adult_quantity') === 0 && (int) $this->input('child_quantity') === 0) {
                    $validator->errors()->add('adult_quantity', 'Debes vender al menos un boleto.');
                    $validator->errors()->add('child_quantity', 'Debes vender al menos un boleto.');
                }
            },
        ];
    }
}
