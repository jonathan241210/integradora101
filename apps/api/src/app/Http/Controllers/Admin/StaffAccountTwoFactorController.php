<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Users\FindManageableStaffAccountAction;
use App\Actions\Admin\Users\ResetStaffTwoFactorAction;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class StaffAccountTwoFactorController extends Controller
{
    public function __invoke(
        Request $request,
        string $user,
        FindManageableStaffAccountAction $find,
        ResetStaffTwoFactorAction $action,
    ): Response {
        $action->execute($request->user(), $find->execute($request->user(), $user));

        return response()->noContent();
    }
}
