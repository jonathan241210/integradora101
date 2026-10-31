<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Users\ResetStaffPasswordAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ResetStaffPasswordRequest;
use Illuminate\Http\Response;

class StaffAccountPasswordController extends Controller
{
    public function __invoke(ResetStaffPasswordRequest $request, ResetStaffPasswordAction $action): Response
    {
        $action->execute($request->user(), $request->target(), $request->validated('password'));

        return response()->noContent();
    }
}
