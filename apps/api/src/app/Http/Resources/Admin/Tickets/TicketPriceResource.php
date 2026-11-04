<?php

namespace App\Http\Resources\Admin\Tickets;

use App\Models\TicketPrice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property TicketPrice $resource */
class TicketPriceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'ticket_type' => $this->resource->ticket_type,
            'amount' => $this->resource->amount,
            'effective_at' => $this->resource->effective_at->utc()->toIso8601ZuluString(),
        ];
    }
}
