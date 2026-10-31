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

        return $next($request);
    }
}
