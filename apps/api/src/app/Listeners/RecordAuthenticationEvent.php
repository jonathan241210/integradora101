<?php

namespace App\Listeners;

use App\Actions\Auth\LogAuthenticationEventAction;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Arr;
use Laravel\Fortify\Events\TwoFactorAuthenticationConfirmed;

class RecordAuthenticationEvent
{
    public function __construct(private readonly LogAuthenticationEventAction $action) {}

    public function handle(object $event): void
    {
        $user = $event->user ?? null;

        $email = $user?->email;

        if ($event instanceof Failed) {
            $email = Arr::get($event->credentials, 'email', $email);
        }

        $name = match (true) {
            $event instanceof Login => 'login',
            $event instanceof Failed => 'failed',
            $event instanceof Logout => 'logout',
            $event instanceof TwoFactorAuthenticationConfirmed => 'two_factor_confirmed',
            default => 'authentication',
        };

        $this->action->execute($name, $email, $user, request());
    }
}
