<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Tickets\ListCancellationReasonsAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\Tickets\CancellationReasonResource;

class TicketCancellationReasonController extends Controller
{
    public function __invoke(ListCancellationReasonsAction $action)
    {
        return CancellationReasonResource::collection(collect($action->execute()));
    }
}
