<?php

namespace App\Http\Middleware;

use App\Actions\Auth\RequiresBrowserTwoFactorLoginAction;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStaffUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() instanceof User) {
            return response()->json([
                'message' => 'No tienes acceso de personal.',
            ], Response::HTTP_FORBIDDEN);
        }

        if (! $request->user()->is_active) {
            return response()->json([
                'message' => 'Tu cuenta está desactivada.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // api-021 CA-42 (RN-19): el token personal de un rol con 2FA tampoco opera fuera de /admin.
        if (app(RequiresBrowserTwoFactorLoginAction::class)->forPersonalAccessToken($request->user())) {
            return response()->json([
                'message' => RequiresBrowserTwoFactorLoginAction::MESSAGE,
                'code' => RequiresBrowserTwoFactorLoginAction::CODE,
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
