<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Http\Request;

class LogAuthenticationEventAction
{
    public function execute(string $event, ?string $email, ?User $user, Request $request): void
    {
        if ($event === 'login' && $user) {
            $user->forceFill(['last_login_at' => now()])->saveQuietly();
        }

        activity('auth')
            ->causedBy($user)
            ->event($event)
            ->withProperties([
                'email' => $email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ])
            ->log($this->descriptionFor($event));
    }

    private function descriptionFor(string $event): string
    {
        return match ($event) {
            'login' => 'Inicio de sesión exitoso',
            'failed' => 'Intento de inicio de sesión fallido',
            'logout' => 'Cierre de sesión',
            'two_factor_confirmed' => 'Segundo factor confirmado',
            default => 'Evento de autenticación',
        };
    }
}
