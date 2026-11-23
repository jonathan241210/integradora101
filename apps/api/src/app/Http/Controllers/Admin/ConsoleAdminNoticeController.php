<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Notices\ListConsoleAdminNoticesAction;
use App\Actions\Admin\Notices\MarkConsoleAdminNoticeReadAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\ConsoleAdminNoticeResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ConsoleAdminNoticeController extends Controller
{
    public function index(Request $request, ListConsoleAdminNoticesAction $action): AnonymousResourceCollection
    {
        return ConsoleAdminNoticeResource::collection($action->execute($request->user()));
    }

    public function read(Request $request, string $notice, MarkConsoleAdminNoticeReadAction $action): Response
    {
        $action->execute($request->user(), (int) $notice);

        return response()->noContent();
    }
}
