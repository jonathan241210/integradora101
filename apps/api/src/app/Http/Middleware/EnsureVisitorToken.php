<?php

namespace App\Http\Middleware;

use App\Models\Visitor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureVisitorToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $token = $user instanceof Visitor ? $user->currentAccessToken() : null;

        if (! $user instanceof Visitor || ! $token || ! $token->can('visitor')) {
            return response()->json([
                'message' => 'No tienes acceso a esta cuenta.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
