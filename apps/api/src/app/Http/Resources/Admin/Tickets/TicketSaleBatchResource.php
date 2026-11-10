<?php

namespace App\Http\Resources\Admin\Tickets;

use App\Actions\Admin\Tickets\IssuedTicketPurchase;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Venta completa: datos de la compra y `tickets` (api-009 CA-50). @property IssuedTicketPurchase $resource */
class TicketSaleBatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $purchase = $this->resource;
        $first = $purchase->tickets[0]->ticket;
        $cashier = $first->cashier;

        return [
            'adult_quantity' => $purchase->adultQuantity,
            'child_quantity' => $purchase->childQuantity,
            'total_amount' => $purchase->totalAmount,
            'purchased_at' => $purchase->purchasedAt->utc()->toIso8601ZuluString(),
            'cashier_name' => $cashier ? TicketHistoryResource::fullName($cashier) : null,
            'tickets' => TicketSaleResource::collection(collect($purchase->tickets))->resolve($request),
        ];
    }
}
