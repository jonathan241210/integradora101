<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Tickets\ListTicketHistoryAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Tickets\ListTicketsRequest;
use App\Http\Resources\Admin\Tickets\TicketHistoryResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TicketController extends Controller
{
    public function index(ListTicketsRequest $request, ListTicketHistoryAction $action): AnonymousResourceCollection
    {
        // `timezone` se lee sin regla de validación: una zona inválida nunca produce 422 (api-007 RN-14).
        return TicketHistoryResource::collection(
            $action->execute($request->user(), $request->validated(), $request->input('timezone')),
        );
    }
}
