<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Reports\BuildDashboardSummaryAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\DashboardSummaryResource;

class DashboardController extends Controller
{
    public function __invoke(BuildDashboardSummaryAction $action): DashboardSummaryResource
    {
        return new DashboardSummaryResource($action->execute());
    }
}
