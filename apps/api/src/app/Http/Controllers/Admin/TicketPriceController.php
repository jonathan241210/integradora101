<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Tickets\ListCurrentTicketPricesAction;
use App\Actions\Admin\Tickets\ScheduleTicketPriceChangeAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Tickets\SaveTicketPricesRequest;
use App\Http\Resources\Admin\Tickets\TicketPriceChangeResource;
use App\Http\Resources\Admin\Tickets\TicketPriceCurrentResource;
use Illuminate\Http\JsonResponse;

class TicketPriceController extends Controller
{
    public function current(ListCurrentTicketPricesAction $action): TicketPriceCurrentResource
    {
        return new TicketPriceCurrentResource($action->execute());
    }

    public function store(SaveTicketPricesRequest $request, ScheduleTicketPriceChangeAction $action): JsonResponse
    {
        $result = $action->execute(
            $request->user(),
            $request->validated('adult_amount'),
            $request->validated('child_amount'),
            (string) $request->validated('mode'),
            $request->effectiveAt(),
        );

        return (new TicketPriceChangeResource($result))->response()->setStatusCode(201);
    }
}
