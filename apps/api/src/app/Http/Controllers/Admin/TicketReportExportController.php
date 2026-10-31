<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Reports\ExportTicketReportAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ExportTicketReportRequest;
use Symfony\Component\HttpFoundation\Response;

class TicketReportExportController extends Controller
{
    public function __invoke(ExportTicketReportRequest $request, ExportTicketReportAction $action): Response
    {
        return $action->execute($request->reportInput());
    }
}
