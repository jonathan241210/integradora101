<?php

namespace App\Http\Requests\Admin\Tickets;

use App\Actions\Admin\Reports\ListCancellationCashiersAction;
use App\Enums\TicketCancellationReason;
use App\Http\Requests\Admin\AdminFormRequest;
use Illuminate\Validation\Rule;

class CancellationReportRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'period' => ['required', 'in:week,month,custom'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
            'cashier_id' => ['nullable', 'integer', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! app(ListCancellationCashiersAction::class)->exists((int) $value)) {
                    $fail('El cajero elegido no es válido.');
                }
            }],
            'page' => ['nullable', 'integer', 'min:1'],
            'reason_code' => ['nullable', 'string', Rule::enum(TicketCancellationReason::class)],
        ];
    }

    public function messages(): array
    {
        return [
            'period.required' => 'Indica el periodo del reporte.',
            'period.in' => 'El periodo elegido no es válido.',
            'date.date_format' => 'La fecha de referencia no es válida.',
            'from.date_format' => 'La fecha inicial no es válida.',
            'to.date_format' => 'La fecha final no es válida.',
            'cashier_id.integer' => 'El cajero elegido no es válido.',
            'page.integer' => 'La página no es válida.',
            'page.min' => 'La página no es válida.',
            'reason_code.enum' => 'El motivo elegido no es válido.',
            'reason_code.string' => 'El motivo elegido no es válido.',
        ];
    }

    /** Filtros validados. El `timezone` del cliente se ignora (api-025 RN-04, api-022 RN-09). */
    public function reportInput(): array
    {
        return $this->validated();
    }
}
