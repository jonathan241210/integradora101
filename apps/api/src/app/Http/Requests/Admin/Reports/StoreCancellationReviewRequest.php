<?php

namespace App\Http\Requests\Admin\Reports;

use App\Actions\Admin\Reports\ListCancellationCashiersAction;
use App\Enums\CancellationReviewStatus;
use App\Http\Requests\Admin\AdminFormRequest;
use Illuminate\Validation\Rule;

/** Registro de revisión de cancelaciones por cajero y día (api-027 CA-17, CA-18). */
class StoreCancellationReviewRequest extends AdminFormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('note'))) {
            $this->merge(['note' => trim($this->input('note'))]);
        }
    }

    public function rules(): array
    {
        return [
            'cashier_id' => ['required', 'integer', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! app(ListCancellationCashiersAction::class)->exists((int) $value)) {
                    $fail('El cajero elegido no es válido.');
                }
            }],
            'business_date' => ['required', 'date_format:Y-m-d'],
            'status' => ['required', 'string', Rule::enum(CancellationReviewStatus::class)],
            'note' => ['required', 'string', 'min:15', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'cashier_id.required' => 'Indica el cajero.',
            'cashier_id.integer' => 'El cajero elegido no es válido.',
            'business_date.required' => 'Indica el día revisado.',
            'business_date.date_format' => 'La fecha del día revisado no es válida.',
            'status.required' => 'Indica la decisión de la revisión.',
            'status.enum' => 'La decisión de la revisión no es válida.',
            'status.string' => 'La decisión de la revisión no es válida.',
            'note.required' => 'Escribe una nota de al menos 15 caracteres.',
            'note.string' => 'La nota no es válida.',
            'note.min' => 'La nota debe tener al menos 15 caracteres.',
            'note.max' => 'La nota no puede exceder 255 caracteres.',
        ];
    }
}
