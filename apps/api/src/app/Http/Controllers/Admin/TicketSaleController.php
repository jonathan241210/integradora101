<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Tickets\RegisterTicketSaleAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Tickets\RegisterTicketSaleRequest;
use App\Http\Resources\Admin\Tickets\TicketSaleResource;
use Illuminate\Http\JsonResponse;

class TicketSaleController extends Controller
{
    public function store(RegisterTicketSaleRequest $request, RegisterTicketSaleAction $action): JsonResponse
    {
        $sale = $action->execute(
            $request->user(),
            (int) $request->validated('adult_quantity'),
            (int) $request->validated('child_quantity'),
        );

        return (new TicketSaleResource($sale))->response()->setStatusCode(201);
    }
}
