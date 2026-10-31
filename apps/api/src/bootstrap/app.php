<?php

use App\Http\Middleware\EnsureAdministratorTwoFactor;
use App\Http\Middleware\EnsureStaffUser;
use App\Http\Middleware\EnsureVisitorToken;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Middleware\PermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->statefulApi();
        $middleware->alias([
            'administrator.two-factor' => EnsureAdministratorTwoFactor::class,
            'permission' => PermissionMiddleware::class,
            'staff.user' => EnsureStaffUser::class,
            'visitor.token' => EnsureVisitorToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'message' => 'Demasiadas solicitudes. Intenta de nuevo en unos instantes.',
            ], 429, $e->getHeaders());
        });
        $exceptions->render(function (UnauthorizedException $e, Request $request) {
            return response()->json([
                'message' => 'No tienes permiso para realizar esta acción.',
            ], 403);
        });
    })->create();
