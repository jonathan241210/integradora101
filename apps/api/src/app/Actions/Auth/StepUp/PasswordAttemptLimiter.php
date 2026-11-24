<?php

namespace App\Actions\Auth\StepUp;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Contador por usuario (no por sesión) de contraseñas incorrectas (api-021 CA-27, CA-41, RN-07).
 * El bloqueo dura lo configurado desde el último fallo que lo provoca, no desde el primero.
 */
class PasswordAttemptLimiter
{
    /** Segundos restantes de bloqueo; 0 si no hay bloqueo activo. */
    public function lockedSeconds(int $userId): int
    {
        $expiresAt = Cache::get($this->lockKey($userId));

        if (! is_int($expiresAt)) {
            return 0;
        }

        $remaining = $expiresAt - Carbon::now()->getTimestamp();

        if ($remaining <= 0) {
            Cache::forget($this->lockKey($userId));

            return 0;
        }

        return $remaining;
    }

    /** Marca que el bloqueo en curso ya auditó un intento; devuelve true solo la primera vez en cada bloqueo. */
    public function markLockedAttemptLogged(int $userId, int $lockedSeconds): bool
    {
        return Cache::add("password-confirmation:locked-logged:{$userId}", true, $lockedSeconds);
    }

    /** Registra un fallo; al llegar al máximo abre el bloqueo y reinicia el contador. */
    public function recordFailure(int $userId): void
    {
        $key = $this->failuresKey($userId);
        Cache::add($key, 0, $this->attemptsWindowSeconds());
        $failures = (int) Cache::increment($key);

        if ($failures >= (int) config('arca.password_confirmation.max_attempts', 5)) {
            Cache::forget($key);
            Cache::forget("password-confirmation:locked-logged:{$userId}");
            $lockout = (int) config('arca.password_confirmation.lockout_minutes', 10) * 60;
            Cache::put($this->lockKey($userId), Carbon::now()->getTimestamp() + $lockout, $lockout);
        }
    }

    /** Un acierto sin bloqueo activo borra los fallos previos (CA-41). */
    public function clearFailures(int $userId): void
    {
        Cache::forget($this->failuresKey($userId));
    }

    private function attemptsWindowSeconds(): int
    {
        return (int) config('arca.password_confirmation.attempts_window_minutes', 10) * 60;
    }

    private function failuresKey(int $userId): string
    {
        return "password-confirmation:failures:{$userId}";
    }

    private function lockKey(int $userId): string
    {
        return "password-confirmation:locked:{$userId}";
    }
}
