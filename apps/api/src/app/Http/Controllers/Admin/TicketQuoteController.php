<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Tickets\QuoteTicketSaleAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Tickets\RegisterTicketSaleRequest;
use App\Http\Resources\Admin\Tickets\TicketQuoteResource;
use Illuminate\Http\JsonResponse;

class TicketQuoteController extends Controller
{
    public function __invoke(RegisterTicketSaleRequest $request, QuoteTicketSaleAction $action): JsonResponse
    {
        $quote = $action->execute(
            (int) $request->validated('adult_quantity'),
            (int) $request->validated('child_quantity'),
        );

        return (new TicketQuoteResource($quote))->response()->setStatusCode(200);
    }
}
