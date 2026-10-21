<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use Illuminate\Http\Request;

class LogVisitorAccessAction
{
    public function execute(string $event, ?string $email, ?Visitor $visitor, Request $request): void
    {
        activity('visitor-auth')
            ->causedBy($visitor)
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
            'registered' => 'Registro de visitante',
            'login' => 'Inicio de sesión de visitante',
            'refresh' => 'Renovación de sesión de visitante',
            'logout' => 'Cierre de sesión de visitante',
            'password_reset' => 'Restablecimiento de contraseña de visitante',
            'deleted' => 'Borrado de cuenta de visitante',
            default => 'Evento de acceso de visitante',
        };
    }
}
