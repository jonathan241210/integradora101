<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Reports\ExportCancellationReportAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Tickets\ExportCancellationReportRequest;
use Symfony\Component\HttpFoundation\Response;

class CancellationReportExportController extends Controller
{
    public function __invoke(ExportCancellationReportRequest $request, ExportCancellationReportAction $action): Response
    {
        return $action->execute($request->user(), $request->reportInput());
    }
}
