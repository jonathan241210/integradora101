<?php

namespace App\Providers;

use App\Listeners\RecordAuthenticationEvent;
use Closure;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Events\TwoFactorAuthenticationConfirmed;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind('visitor.password', function () {
            $rule = Password::min(8)->letters()->numbers();

            return app()->environment('local') ? $rule : $rule->uncompromised();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Password::defaults(function () {
            $rule = Password::min(12)->mixedCase()->numbers()->symbols();

            return app()->environment('local') ? $rule : $rule->uncompromised();
        });

        DB::prohibitDestructiveCommands();
        $this->forceHttps();
        $this->registerVisitorLimiters();

        Event::listen(Login::class, RecordAuthenticationEvent::class);
        Event::listen(Failed::class, RecordAuthenticationEvent::class);
        Event::listen(Logout::class, RecordAuthenticationEvent::class);
        Event::listen(TwoFactorAuthenticationConfirmed::class, RecordAuthenticationEvent::class);
    }

    public function forceHttps(): void
    {
        if (! $this->app->environment(['local', 'testing'])) {
            URL::forceScheme('https');
        }
    }

    private function registerVisitorLimiters(): void
    {
        $response = $this->visitorThrottleResponse();

        RateLimiter::for('visitor-register', function (Request $request) use ($response) {
            return Limit::perHour(5)->by((string) $request->ip())->response($response);
        });

        RateLimiter::for('visitor-login', function (Request $request) use ($response) {
            $key = Str::lower((string) $request->input('email')).'|'.$request->ip();

            return Limit::perMinute(5)->by($key)->response($response);
        });

        RateLimiter::for('visitor-resend', function (Request $request) use ($response) {
            $email = Str::lower((string) $request->input('email'));

            return [
                Limit::perMinute(1)->by($email.'|minute')->response($response),
                Limit::perHour(5)->by($email.'|hour')->response($response),
            ];
        });

        RateLimiter::for('visitor-forgot', function (Request $request) use ($response) {
            return Limit::perHour(3)->by(Str::lower((string) $request->input('email')))->response($response);
        });
    }

    private function visitorThrottleResponse(): Closure
    {
        return function (Request $request, array $headers) {
            $seconds = max(1, (int) ($headers['Retry-After'] ?? 1));

            return response()->json([
                'message' => "Espera {$seconds} segundos e inténtalo de nuevo.",
            ], 429, $headers);
        };
    }
}
