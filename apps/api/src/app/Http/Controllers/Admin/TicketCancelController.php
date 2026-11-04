<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Tickets\CancelTicketAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Tickets\CancelTicketRequest;
use App\Http\Resources\Admin\Tickets\TicketHistoryResource;

class TicketCancelController extends Controller
{
    public function __invoke(CancelTicketRequest $request, string $ticket, CancelTicketAction $action): TicketHistoryResource
    {
        return new TicketHistoryResource($action->execute(
            $request->user(),
            $request->ticket(),
            (string) $request->validated('reason'),
        ));
    }
}
