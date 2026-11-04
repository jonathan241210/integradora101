<?php

namespace App\Http\Resources\Admin\Tickets;

use App\Actions\Admin\Tickets\IssuedTicketSale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property IssuedTicketSale $resource */
class TicketSaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $ticket = $this->resource->ticket;
        $cashier = $ticket->cashier;

        return [
            'folio' => $ticket->id,
            'purchased_at' => $ticket->purchased_at->utc()->toIso8601ZuluString(),
            'adult_quantity' => $ticket->adult_quantity,
            'child_quantity' => $ticket->child_quantity,
            'adult_unit_price' => $ticket->adult_unit_price,
            'child_unit_price' => $ticket->child_unit_price,
            'total_amount' => $ticket->total_amount,
            'status' => $ticket->status,
            'payment_method' => $ticket->payment_method,
            'cashier_name' => $cashier ? TicketHistoryResource::fullName($cashier) : null,
            'qr_svg' => $this->resource->qrSvg,
        ];
    }
}
