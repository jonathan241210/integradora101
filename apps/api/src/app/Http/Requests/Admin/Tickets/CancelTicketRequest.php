<?php

namespace App\Http\Requests\Admin\Tickets;

use App\Enums\TicketCancellationReason;
use App\Http\Requests\Admin\AdminFormRequest;
use App\Models\Ticket;
use Illuminate\Validation\Rule;

/**
 * Resuelve el boleto del cajero antes de validar el cuerpo: un boleto ajeno o inexistente es siempre 404
 * (api-009 CA-13, RN-16; ADR 0021, excepción c).
 */
class CancelTicketRequest extends AdminFormRequest
{
    private ?Ticket $ticket = null;

    public function authorize(): bool
    {
        $id = (string) $this->route('ticket');

        $ticket = ctype_digit($id)
            ? Ticket::query()->where('cashier_id', $this->user()->id)->find((int) $id)
            : null;

        abort_if($ticket === null, 404, 'Boleto no encontrado.');
        $this->ticket = $ticket;

        return true;
    }

    public function ticket(): Ticket
    {
        return $this->ticket;
    }

    protected function prepareForValidation(): void
    {
        $reason = $this->input('reason');

        if (is_string($reason)) {
            $reason = trim($reason);
            $this->merge(['reason' => $reason === '' ? null : $reason]);
        }
    }

    public function rules(): array
    {
        $isOther = $this->input('reason_code') === TicketCancellationReason::Other->value;

        return [
            'reason_code' => ['required', 'string', Rule::enum(TicketCancellationReason::class)],
            'reason' => $isOther
                ? ['required', 'string', 'min:15', 'max:255']
                : ['nullable', 'string', 'max:255'],
        ];
    }

    public function reasonCode(): TicketCancellationReason
    {
        return TicketCancellationReason::from($this->validated('reason_code'));
    }

    public function comment(): ?string
    {
        $comment = $this->validated('reason');

        return is_string($comment) && $comment !== '' ? $comment : null;
    }

    public function messages(): array
    {
        return [
            'reason_code.required' => 'Selecciona un motivo de cancelación.',
            'reason_code.string' => 'El motivo elegido no es válido.',
            'reason_code.enum' => 'El motivo elegido no es válido.',
            'reason.required' => 'Describe el motivo con al menos 15 caracteres.',
            'reason.min' => 'Describe el motivo con al menos 15 caracteres.',
            'reason.string' => 'El comentario de la cancelación debe ser texto.',
            'reason.max' => 'El comentario de la cancelación no puede superar 255 caracteres.',
        ];
    }
}
