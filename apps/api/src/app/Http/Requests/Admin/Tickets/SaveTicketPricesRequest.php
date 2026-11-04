<?php

namespace App\Http\Requests\Admin\Tickets;

use App\Actions\Admin\Tickets\ScheduleTicketPriceChangeAction;
use App\Http\Requests\Admin\AdminFormRequest;
use Carbon\CarbonImmutable;
use Illuminate\Validation\Validator;

class SaveTicketPricesRequest extends AdminFormRequest
{
    /** ISO 8601 con desfase horario o «Z» (api-009 plan, decisión 3). */
    private const ISO_WITH_OFFSET = '/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/';

    private ?CarbonImmutable $effectiveAt = null;

    public function rules(): array
    {
        $amount = ['required', 'numeric', 'gt:0', 'max:99999999.99', 'regex:/^\d+(\.\d{1,2})?$/'];

        return [
            'adult_amount' => $amount,
            'child_amount' => $amount,
            'mode' => ['required', 'in:immediate,scheduled'],
            'effective_at' => ['required_if:mode,scheduled', 'nullable', 'string', 'regex:'.self::ISO_WITH_OFFSET],
        ];
    }

    public function messages(): array
    {
        $fields = ['adult_amount' => 'de adulto', 'child_amount' => 'de niño'];
        $messages = [
            'mode.required' => 'Indica si el cambio es inmediato o programado.',
            'mode.in' => 'El modo debe ser «immediate» o «scheduled».',
            'effective_at.required_if' => 'Indica la fecha y hora en que entra en vigor el cambio.',
            'effective_at.regex' => 'La fecha y hora debe estar en formato ISO 8601 con zona horaria, por ejemplo 2026-12-01T09:00:00-06:00.',
        ];
        foreach ($fields as $field => $label) {
            $messages["{$field}.required"] = "Indica el monto {$label}.";
            $messages["{$field}.numeric"] = "El monto {$label} debe ser numérico.";
            $messages["{$field}.gt"] = "El monto {$label} debe ser mayor que cero.";
            $messages["{$field}.max"] = "El monto {$label} es demasiado grande.";
            $messages["{$field}.regex"] = "El monto {$label} admite como máximo dos decimales.";
        }

        return $messages;
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty() || $this->input('mode') !== ScheduleTicketPriceChangeAction::MODE_SCHEDULED) {
                    return;
                }

                $raw = (string) $this->input('effective_at');

                try {
                    $effective = CarbonImmutable::parse($raw)->utc();
                } catch (\Throwable) {
                    $validator->errors()->add('effective_at', 'La fecha y hora indicada no es válida.');

                    return;
                }

                // Fecha real: Carbon desborda 2026-02-31 a marzo; se compara la fecha escrita con la parseada.
                if (! $this->isRealDate($raw)) {
                    $validator->errors()->add('effective_at', 'La fecha y hora indicada no es válida.');

                    return;
                }

                $now = CarbonImmutable::now('UTC')->startOfSecond();

                if ($effective->lt($now)) {
                    $validator->errors()->add('effective_at', 'La fecha y hora del cambio no puede ser anterior al momento actual.');

                    return;
                }

                // Límite de un año (CA-45, RN-31): exactamente un año se admite.
                if ($effective->gt($now->addYear())) {
                    $validator->errors()->add('effective_at', __('validation.ticket_effective_at_horizon'));

                    return;
                }

                $this->effectiveAt = $effective;
            },
        ];
    }

    private function isRealDate(string $raw): bool
    {
        if (! preg_match('/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/', $raw, $m)) {
            return false;
        }

        return checkdate((int) $m[2], (int) $m[3], (int) $m[1]) && (int) $m[4] <= 23 && (int) $m[5] <= 59;
    }

    /** Instante de entrada en vigor en UTC (solo en modo scheduled). */
    public function effectiveAt(): ?CarbonImmutable
    {
        return $this->effectiveAt;
    }
}
