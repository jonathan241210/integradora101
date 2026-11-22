<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Users\ResetStaffTwoFactorAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ResetStaffTwoFactorRequest;
use Illuminate\Http\Response;

class StaffAccountTwoFactorController extends Controller
{
    public function __invoke(ResetStaffTwoFactorRequest $request, ResetStaffTwoFactorAction $action): Response
    {
        $action->execute($request->user(), $request->target());

        return response()->noContent();
    }
}
