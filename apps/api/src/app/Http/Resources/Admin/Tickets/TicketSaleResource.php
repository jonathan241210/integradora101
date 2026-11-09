<?php

namespace App\Http\Resources\Admin\Tickets;

use App\Actions\Admin\Tickets\CalculateTicketTotalAction;
use App\Actions\Admin\Tickets\IssuedTicketSale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Un boleto individual de la venta (api-009 CA-50, R-B1): sin precios por tipo. @property IssuedTicketSale $resource */
class TicketSaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $ticket = $this->resource->ticket;
        $cashier = $ticket->cashier;
        $unit = $this->resource->type === 'adult' ? $ticket->adult_unit_price : $ticket->child_unit_price;

        return [
            'folio' => $ticket->id,
            'ticket_type' => $this->resource->type,
            'unit_price' => CalculateTicketTotalAction::format(CalculateTicketTotalAction::toCents($unit)),
            'adult_quantity' => $ticket->adult_quantity,
            'child_quantity' => $ticket->child_quantity,
            'total_amount' => $ticket->total_amount,
            'purchased_at' => $ticket->purchased_at->utc()->toIso8601ZuluString(),
            'status' => $ticket->status,
            'payment_method' => $ticket->payment_method,
            'cashier_name' => $cashier ? TicketHistoryResource::fullName($cashier) : null,
            'qr_svg' => $this->resource->qrSvg,
        ];
    }
}
