<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Reports\ListCancellationCashiersAction;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class CancellationReportCashiersController extends Controller
{
    public function __invoke(ListCancellationCashiersAction $action): JsonResponse
    {
        return response()->json(['data' => $action->execute()]);
    }
}
