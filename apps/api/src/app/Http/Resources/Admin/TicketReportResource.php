<?php

namespace App\Http\Resources\Admin;

use App\Actions\Admin\Reports\PresentTicketRow;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $tickets = $this->resource['tickets'];

        return [
            'period' => $this->resource['period']->toArray(),
            'totals' => $this->resource['totals'],
            'daily' => $this->resource['daily'],
            'tickets' => collect($tickets->items())->map(fn ($ticket) => PresentTicketRow::from($ticket, $this->resource['period']->timezone()))->all(),
        ];
    }

    public function with(Request $request): array
    {
        $tickets = $this->resource['tickets'];

        return ['meta' => [
            'current_page' => $tickets->currentPage(),
            'last_page' => $tickets->lastPage(),
            'per_page' => $tickets->perPage(),
            'total' => $tickets->total(),
        ]];
    }
}
