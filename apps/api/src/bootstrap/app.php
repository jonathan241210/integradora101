<?php

use App\Http\Middleware\EnsureAdministratorTwoFactor;
use App\Http\Middleware\EnsureStaffUser;
use App\Http\Middleware\EnsureVisitorToken;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

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
            'staff.user' => EnsureStaffUser::class,
            'visitor.token' => EnsureVisitorToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
