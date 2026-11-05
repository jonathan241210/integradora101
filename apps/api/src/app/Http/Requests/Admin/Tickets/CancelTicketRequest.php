<?php

namespace App\Http\Requests\Admin\Tickets;

use App\Http\Requests\Admin\AdminFormRequest;
use App\Models\Ticket;

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

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required' => 'Indica el motivo de la cancelación.',
            'reason.string' => 'El motivo de la cancelación debe ser texto.',
            'reason.max' => 'El motivo de la cancelación no puede superar 255 caracteres.',
        ];
    }
}
