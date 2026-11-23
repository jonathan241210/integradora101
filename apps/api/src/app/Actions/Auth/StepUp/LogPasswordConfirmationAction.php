<?php

namespace App\Actions\Auth\StepUp;

use App\Models\User;
use Illuminate\Http\Request;

/** Auditoría de confirmaciones de contraseña (api-021 CA-28, RN-08, RN-18). Nunca registra la contraseña. */
class LogPasswordConfirmationAction
{
    public function execute(User $user, Request $request, string $mode, string $result, bool $locked = false): void
    {
        activity('auth')
            ->causedBy($user)
            ->event("password-confirmation.{$result}")
            ->withProperties([
                'email' => $user->email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'route' => $request->route()?->getName(),
                'mode' => $mode,
                'locked' => $locked,
            ])
            ->log($this->description($result, $locked));
    }

    private function description(string $result, bool $locked): string
    {
        if ($locked) {
            return 'Confirmación de contraseña bloqueada por intentos';
        }

        return $result === 'succeeded'
            ? 'Confirmación de contraseña correcta'
            : 'Confirmación de contraseña incorrecta';
    }
}
