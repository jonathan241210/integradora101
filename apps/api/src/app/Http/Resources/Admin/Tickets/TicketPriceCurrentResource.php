<?php

namespace App\Http\Resources\Admin\Tickets;

use App\Models\TicketPrice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Precios vigentes por tipo con su próximo cambio programado (api-009 CA-17). */
class TicketPriceCurrentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $out = [];
        foreach ($this->resource as $type => $entry) {
            $current = $entry['current'];
            $next = $entry['next'];
            $out[$type] = [
                'amount' => $current?->amount,
                'effective_at' => $current?->effective_at->utc()->toIso8601ZuluString(),
                'message' => $current === null ? 'No hay un precio vigente configurado para este tipo de boleto.' : null,
                'next' => $next instanceof TicketPrice ? [
                    'amount' => $next->amount,
                    'effective_at' => $next->effective_at->utc()->toIso8601ZuluString(),
                ] : null,
            ];
        }

        return $out;
    }
}
