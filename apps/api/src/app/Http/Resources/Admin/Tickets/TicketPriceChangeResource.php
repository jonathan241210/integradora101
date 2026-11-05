<?php

namespace App\Http\Resources\Admin\Tickets;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Respuesta del cambio de precio: filas creadas y precios vigentes tras la operación. */
class TicketPriceChangeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'prices' => TicketPriceResource::collection($this->resource['prices'])->resolve($request),
            'current' => (new TicketPriceCurrentResource($this->resource['current']))->resolve($request),
        ];
    }
}
