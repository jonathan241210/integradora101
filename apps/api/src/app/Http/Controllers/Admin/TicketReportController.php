<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Reports\BuildTicketReportAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TicketReportRequest;
use App\Http\Resources\Admin\TicketReportResource;

class TicketReportController extends Controller
{
    public function __invoke(TicketReportRequest $request, BuildTicketReportAction $action): TicketReportResource
    {
        return new TicketReportResource($action->execute($request->reportInput()));
    }
}
