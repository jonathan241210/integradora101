<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Reports\BuildDashboardSummaryAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\DashboardSummaryResource;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request, BuildDashboardSummaryAction $action): DashboardSummaryResource
    {
        return new DashboardSummaryResource($action->execute($request->input('timezone')));
    }
}
