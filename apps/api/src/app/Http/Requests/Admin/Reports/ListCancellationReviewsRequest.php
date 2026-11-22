<?php

namespace App\Http\Requests\Admin\Reports;

use App\Actions\Admin\Reports\ListCancellationCashiersAction;
use App\Http\Requests\Admin\AdminFormRequest;

/** Historial de revisiones de un cajero y día (api-027 CA-20). */
class ListCancellationReviewsRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'cashier_id' => ['required', 'integer', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! app(ListCancellationCashiersAction::class)->exists((int) $value)) {
                    $fail('El cajero elegido no es válido.');
                }
            }],
            'business_date' => ['required', 'date_format:Y-m-d'],
        ];
    }

    public function messages(): array
    {
        return [
            'cashier_id.required' => 'Indica el cajero.',
            'cashier_id.integer' => 'El cajero elegido no es válido.',
            'business_date.required' => 'Indica el día revisado.',
            'business_date.date_format' => 'La fecha del día revisado no es válida.',
        ];
    }
}
