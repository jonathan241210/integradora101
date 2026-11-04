<?php

namespace App\Http\Resources\Admin\Tickets;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property Ticket $resource */
class TicketHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $ticket = $this->resource;

        return [
            'folio' => $ticket->id,
            'purchased_at' => $ticket->purchased_at?->utc()->toIso8601ZuluString(),
            'adult_quantity' => $ticket->adult_quantity,
            'child_quantity' => $ticket->child_quantity,
            'total_amount' => $ticket->total_amount,
            'status' => $ticket->status,
            'cancelled_at' => $ticket->cancelled_at?->utc()->toIso8601ZuluString(),
            'cancellation_reason' => $ticket->cancellation_reason,
            'cashier_name' => $ticket->cashier ? self::fullName($ticket->cashier) : null,
            'cancellable' => (bool) $ticket->getAttribute('cancellable'),
        ];
    }

    public static function fullName(User $user): string
    {
        return trim(implode(' ', array_filter([$user->first_name, $user->last_name, $user->second_last_name])));
    }
}
