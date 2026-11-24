<?php

use App\Exceptions\PasswordAttemptsExceededException;
use App\Exceptions\PasswordIncorrectException;
use App\Http\Middleware\ConsoleManagedAccountGuard;
use App\Http\Middleware\EnsureAdministratorTwoFactor;
use App\Http\Middleware\EnsureStaffUser;
use App\Http\Middleware\EnsureVisitorToken;
use App\Http\Middleware\RequireStepUpConfirmation;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;

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
        // La PWA usa tokens Bearer, que no son vulnerables a CSRF.
        $middleware->validateCsrfTokens(except: ['api/v1/staff/*']);
        $middleware->alias([
            'administrator.two-factor' => EnsureAdministratorTwoFactor::class,
            'console-managed-account' => ConsoleManagedAccountGuard::class,
            'permission' => PermissionMiddleware::class,
            'role' => RoleMiddleware::class,
            'staff.user' => EnsureStaffUser::class,
            'step-up' => RequireStepUpConfirmation::class,
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
        // api-021: 422 con la contraseña incorrecta y 429 con el bloqueo por intentos.
        $exceptions->render(fn (PasswordIncorrectException $e, Request $request) => response()->json([
            'message' => $e->getMessage(),
            'errors' => ['password' => [$e->getMessage()]],
        ], 422));
        $exceptions->render(fn (PasswordAttemptsExceededException $e, Request $request) => response()->json([
            'message' => $e->getMessage(),
        ], 429, ['Retry-After' => $e->seconds]));
        $exceptions->render(function (UnauthorizedException $e, Request $request) {
            return response()->json([
                'message' => 'No tienes permiso para realizar esta acción.',
            ], 403);
        });
    })->create();
