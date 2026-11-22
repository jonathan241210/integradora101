<?php

namespace App\Providers;

use App\Actions\Admin\Enclosures\Qr\EnclosureQrCodeGenerator;
use App\Actions\Admin\Enclosures\Qr\QrCodeValueGenerator;
use App\Listeners\ClearStepUpWindow;
use App\Listeners\RecordAuthenticationEvent;
use App\Push\ExpoPushGateway;
use App\Push\PushGateway;
use App\Support\BusinessTimezone;
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
        $this->app->bind(PushGateway::class, ExpoPushGateway::class);
        $this->app->bind(QrCodeValueGenerator::class, EnclosureQrCodeGenerator::class);

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

        // api-025 CA-14: una zona de negocio inválida impide el arranque (sin respaldo silencioso).
        BusinessTimezone::assertValid();

        DB::prohibitDestructiveCommands();
        $this->forceHttps();
        $this->registerVisitorLimiters();
        $this->registerTicketLimiters();
        $this->registerSearchLimiter();
        $this->registerPendingCountsLimiter();
        $this->registerCancellationReportLimiter();
        $this->registerPasswordConfirmationLimiter();

        // api-021 CA-10: la ventana de confirmación no sobrevive a un inicio ni a un cierre de sesión.
        Event::listen(Login::class, ClearStepUpWindow::class);
        Event::listen(Logout::class, ClearStepUpWindow::class);
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

    /** Límites por usuario autenticado de api-009 (CA-43, CA-44, RN-30). */
    private function registerTicketLimiters(): void
    {
        $response = function (Request $request, array $headers) {
            $seconds = max(1, (int) ($headers['Retry-After'] ?? 1));

            return response()->json(['message' => __('auth.throttle', ['seconds' => $seconds])], 429, $headers);
        };
        $key = fn (Request $request): string => (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());

        // El middleware `throttle` corre antes que `permission:` (orden de prioridad de Laravel): quien no tiene
        // el permiso recibirá 403 y no debe consumir cuota (RN-30), por eso no se le aplica límite aquí.
        RateLimiter::for('ticket-sales', fn (Request $request) => $request->user()?->can('tickets.create')
            ? Limit::perMinute(60)->by($key($request))->response($response)
            : Limit::none());
        RateLimiter::for('ticket-quotes', fn (Request $request) => $request->user()?->can('tickets.create')
            ? Limit::perMinute(120)->by($key($request))->response($response)
            : Limit::none());
        RateLimiter::for('ticket-cancel', fn (Request $request) => $request->user()?->can('tickets.cancel')
            ? Limit::perMinute(20)->by($key($request))->response($response)
            : Limit::none());
    }

    /** CA-47: 30 búsquedas por minuto y usuario; el 429 no consulta nada ni registra el término. */
    private function registerSearchLimiter(): void
    {
        RateLimiter::for('admin-search', fn (Request $request) => Limit::perMinute(30)
            ->by((string) ($request->user()?->getAuthIdentifier() ?? $request->ip()))
            ->response(fn (Request $request, array $headers) => response()->json([
                'message' => 'Demasiadas búsquedas. Espera un minuto e inténtalo de nuevo.',
            ], 429, $headers)));
    }

    /** api-024 CA-10: 60 consultas por minuto y usuario; quien no tiene permiso no consume cuota y recibe 403. */
    private function registerPendingCountsLimiter(): void
    {
        RateLimiter::for('admin-pending-counts', function (Request $request) {
            $user = $request->user();

            if (! $user?->hasAnyPermission(['species.review', 'memories.review', 'reports.cancellations.view'])) {
                return Limit::none();
            }

            return Limit::perMinute(60)
                ->by((string) $user->getAuthIdentifier())
                ->response(fn (Request $request, array $headers) => response()->json([
                    'message' => 'Demasiadas consultas. Espera un minuto e inténtalo de nuevo.',
                ], 429, $headers));
        });
    }

    /** api-022: 60 consultas por minuto y usuario a las lecturas del reporte de cancelaciones; sin permiso no consume cuota. */
    private function registerCancellationReportLimiter(): void
    {
        RateLimiter::for('cancellation-report', function (Request $request) {
            $user = $request->user();

            if (! $user?->can('reports.cancellations.view')) {
                return Limit::none();
            }

            return Limit::perMinute(60)
                ->by((string) $user->getAuthIdentifier())
                ->response(fn (Request $request, array $headers) => response()->json([
                    'message' => 'Demasiadas consultas al reporte. Espera un minuto e inténtalo de nuevo.',
                ], 429, $headers));
        });
    }

    /** api-021: 10 confirmaciones por minuto y usuario, antes de verificar la contraseña. */
    private function registerPasswordConfirmationLimiter(): void
    {
        RateLimiter::for('password-confirmation', fn (Request $request) => Limit::perMinute(10)
            ->by((string) ($request->user()?->getAuthIdentifier() ?? $request->ip()))
            ->response(fn (Request $request, array $headers) => response()->json([
                'message' => 'Demasiadas solicitudes de confirmación. Espera un minuto e inténtalo de nuevo.',
            ], 429, $headers)));
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
