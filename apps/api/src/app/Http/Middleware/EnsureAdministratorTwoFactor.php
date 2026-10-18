<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdministratorTwoFactor
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasAnyRole(config('arca.two_factor_roles', []))) {
            return $next($request);
        }

        $routeName = (string) $request->route()?->getName();
        $path = trim($request->path(), '/');
        $isException = in_array($routeName, ['auth.me', 'logout'], true)
            || str_starts_with($routeName, 'two-factor.')
            || str_starts_with($path, 'api/v1/auth/user/two-factor-');

        if ($isException || $user->two_factor_confirmed_at) {
            return $next($request);
        }

        return response()->json([
            'message' => 'Debes configurar tu segundo factor de autenticación.',
            'code' => 'two_factor_setup_required',
        ], Response::HTTP_FORBIDDEN);
    }
}
