<?php

namespace App\Http\Middleware;

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

        return $next($request);
    }
}
