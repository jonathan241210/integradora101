<?php

namespace App\Http\Middleware;

use App\Models\Visitor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Defensa en profundidad de api-004 CA-04: el token de visitante solo se emite con el correo verificado,
 * pero las rutas de momentos (api-010 CA-05) lo comprueban de nuevo.
 */
class EnsureVisitorEmailVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof Visitor || $user->email_verified_at === null) {
            return response()->json([
                'message' => 'Confirma tu correo antes de continuar.',
                'code' => 'email_not_verified',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
