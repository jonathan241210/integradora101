<?php

namespace App\Support\StepUp;

use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Carbon;

/**
 * Ventana de confirmación de contraseña (api-021 RN-03, RN-11). Vive en la sesión del usuario que confirmó,
 * dura un tiempo fijo y no se renueva con actividad. Guarda también el usuario que confirmó y solo vale para él.
 * Sin sesión, la ventana está cerrada (falla cerrado).
 */
final class StepUpWindow
{
    public const KEY = 'arca.step_up.confirmed_until';

    public const USER_KEY = 'arca.step_up.user_id';

    /** Abre la ventana para el usuario y devuelve el instante (epoch) en que termina. */
    public static function open(Session $session, int $userId, ?Carbon $now = null): int
    {
        $until = ($now ?? Carbon::now())->getTimestamp() + self::seconds();
        $session->put(self::KEY, $until);
        $session->put(self::USER_KEY, $userId);

        return $until;
    }

    public static function isOpen(?Session $session, int $userId, ?Carbon $now = null): bool
    {
        if ($session === null) {
            return false;
        }

        $until = $session->get(self::KEY);

        return is_int($until)
            && $session->get(self::USER_KEY) === $userId
            && ($now ?? Carbon::now())->getTimestamp() < $until;
    }

    public static function close(?Session $session): void
    {
        $session?->forget([self::KEY, self::USER_KEY]);
    }

    public static function seconds(): int
    {
        return (int) config('arca.password_confirmation.window_minutes', 10) * 60;
    }
}
