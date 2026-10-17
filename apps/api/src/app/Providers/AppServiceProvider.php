<?php

namespace App\Providers;

use App\Listeners\RecordAuthenticationEvent;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Events\TwoFactorAuthenticationConfirmed;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
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

        Event::listen(Login::class, RecordAuthenticationEvent::class);
        Event::listen(Failed::class, RecordAuthenticationEvent::class);
        Event::listen(Logout::class, RecordAuthenticationEvent::class);
        Event::listen(TwoFactorAuthenticationConfirmed::class, RecordAuthenticationEvent::class);
    }
}
