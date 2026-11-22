<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Auth\StepUp\ConfirmStaffPasswordAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ConfirmStaffPasswordRequest;
use Illuminate\Http\JsonResponse;

class PasswordConfirmationController extends Controller
{
    public function __invoke(ConfirmStaffPasswordRequest $request, ConfirmStaffPasswordAction $action): JsonResponse
    {
        $until = $action->execute($request->user(), $request->validated('password'), $request);

        return response()->json(['data' => ['confirmed_until' => $until->format('Y-m-d\TH:i:s\Z')]]);
    }
}
