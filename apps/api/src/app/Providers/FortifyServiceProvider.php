<?php

namespace App\Providers;

use App\Actions\Auth\AuthenticateStaffAction;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Fortify::authenticateUsing(fn (Request $request) => app(AuthenticateStaffAction::class)->execute($request));

        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)
                ->by(Str::lower((string) $request->input('email')).'|'.$request->ip())
                ->response(fn (Request $request, array $headers) => response()->json([
                    'message' => __('auth.throttle', [
                        'seconds' => $headers['Retry-After'] ?? 60,
                    ]),
                ], 429, $headers));
        });

        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)
                ->by((string) $request->session()->get('login.id'))
                ->response(fn (Request $request, array $headers) => response()->json([
                    'message' => __('auth.throttle', [
                        'seconds' => $headers['Retry-After'] ?? 60,
                    ]),
                ], 429, $headers));
        });
    }
}
