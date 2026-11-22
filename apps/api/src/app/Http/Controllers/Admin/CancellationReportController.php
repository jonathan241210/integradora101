<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Reports\BuildCancellationReportAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Tickets\CancellationReportRequest;
use App\Http\Resources\Admin\Reports\CancellationReportResource;

class CancellationReportController extends Controller
{
    public function __invoke(CancellationReportRequest $request, BuildCancellationReportAction $action): CancellationReportResource
    {
        return new CancellationReportResource($action->execute($request->reportInput(), (int) ($request->validated('page') ?? 1)));
    }
}
