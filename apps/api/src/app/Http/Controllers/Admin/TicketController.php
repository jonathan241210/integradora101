<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Tickets\ListTicketHistoryAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Tickets\ListTicketsRequest;
use App\Http\Resources\Admin\Tickets\TicketHistoryResource;
use App\Support\BusinessTimezone;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TicketController extends Controller
{
    public function index(ListTicketsRequest $request, ListTicketHistoryAction $action): AnonymousResourceCollection
    {
        // El `timezone` del cliente se ignora (api-025 RN-04); la respuesta informa la zona de negocio (CA-12).
        return TicketHistoryResource::collection(
            $action->execute($request->user(), $request->validated()),
        )->additional(['timezone' => BusinessTimezone::name()]);
    }
}
