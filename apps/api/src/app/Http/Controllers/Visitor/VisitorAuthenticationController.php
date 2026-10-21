<?php

namespace App\Http\Controllers\Visitor;

use App\Actions\Visitor\LoginVisitorAction;
use App\Actions\Visitor\LogoutVisitorAction;
use App\Actions\Visitor\RegisterVisitorAction;
use App\Actions\Visitor\ResetVisitorPasswordAction;
use App\Actions\Visitor\RotateRefreshTokenAction;
use App\Actions\Visitor\SendVisitorCodeAction;
use App\Actions\Visitor\VerifyVisitorEmailAction;
use App\Http\Requests\Visitor\EmailOnlyVisitorRequest;
use App\Http\Requests\Visitor\LoginVisitorRequest;
use App\Http\Requests\Visitor\LogoutVisitorRequest;
use App\Http\Requests\Visitor\RefreshVisitorTokenRequest;
use App\Http\Requests\Visitor\RegisterVisitorRequest;
use App\Http\Requests\Visitor\ResetVisitorPasswordRequest;
use App\Http\Requests\Visitor\VerifyVisitorEmailRequest;
use App\Models\Visitor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class VisitorAuthenticationController extends VisitorController
{
    public function register(RegisterVisitorRequest $request, RegisterVisitorAction $action): JsonResponse
    {
        return $this->respond($action->execute($request->validated(), $request));
    }

    public function verify(VerifyVisitorEmailRequest $request, VerifyVisitorEmailAction $action): JsonResponse
    {
        return $this->respond($action->execute($request->validated('email'), $request->validated('code')));
    }

    public function resend(EmailOnlyVisitorRequest $request, SendVisitorCodeAction $action): JsonResponse
    {
        $action->execute(
            Visitor::query()->where('email', $request->validated('email'))->first(),
            'email_verification',
        );

        return response()->json([
            'message' => 'Si el correo está registrado, enviamos un código de 6 dígitos.',
        ], 202);
    }

    public function login(LoginVisitorRequest $request, LoginVisitorAction $action): JsonResponse
    {
        return $this->respond($action->execute(
            $request->validated('email'),
            $request->validated('password'),
            $request->validated('device_name'),
            $request,
        ));
    }

    public function refresh(RefreshVisitorTokenRequest $request, RotateRefreshTokenAction $action): JsonResponse
    {
        return $this->respond($action->execute($request->validated('refresh_token'), $request));
    }

    public function logout(LogoutVisitorRequest $request, LogoutVisitorAction $action): JsonResponse|Response
    {
        return $this->respond($action->execute($request->user(), $request->validated('refresh_token'), $request));
    }

    public function forgot(EmailOnlyVisitorRequest $request, SendVisitorCodeAction $action): JsonResponse
    {
        $action->execute(
            Visitor::query()->where('email', $request->validated('email'))->first(),
            'password_reset',
        );

        return response()->json([
            'message' => 'Si el correo está registrado, enviamos un código de 6 dígitos.',
        ], 202);
    }

    public function reset(ResetVisitorPasswordRequest $request, ResetVisitorPasswordAction $action): JsonResponse
    {
        return $this->respond($action->execute($request->validated(), $request));
    }
}
