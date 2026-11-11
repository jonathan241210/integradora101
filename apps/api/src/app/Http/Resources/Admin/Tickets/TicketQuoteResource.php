<?php

namespace App\Http\Resources\Admin\Tickets;

use App\Actions\Admin\Tickets\CalculateTicketTotalAction;
use App\Actions\Admin\Tickets\TicketQuote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property TicketQuote $resource */
class TicketQuoteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $quote = $this->resource;

        return [
            'adult_unit_price' => CalculateTicketTotalAction::format(CalculateTicketTotalAction::toCents($quote->adultPrice->amount)),
            'child_unit_price' => CalculateTicketTotalAction::format(CalculateTicketTotalAction::toCents($quote->childPrice->amount)),
            'adult_subtotal' => $quote->adultSubtotal,
            'child_subtotal' => $quote->childSubtotal,
            'total_amount' => $quote->totalAmount,
        ];
    }
}
