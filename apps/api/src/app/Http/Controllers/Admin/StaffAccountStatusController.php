<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Users\SetStaffAccountStatusAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SetStaffAccountStatusRequest;
use App\Http\Resources\Admin\StaffAccountResource;

class StaffAccountStatusController extends Controller
{
    public function __invoke(SetStaffAccountStatusRequest $request, SetStaffAccountStatusAction $action): StaffAccountResource
    {
        return new StaffAccountResource($action->execute($request->user(), $request->target(), $request->boolean('is_active')));
    }
}
