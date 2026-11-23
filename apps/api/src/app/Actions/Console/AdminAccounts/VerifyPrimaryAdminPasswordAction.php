<?php

namespace App\Actions\Console\AdminAccounts;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

/**
 * Valida la contraseña del admin titular para los comandos de nivel alto (api-023). 5 fallos en 10 minutos bloquean
 * los comandos de nivel alto durante 10 minutos; contador y bloqueo en la caché, con candado para que no se pierdan
 * intentos concurrentes. Se auditan los fallos y bloqueos, nunca la contraseña.
 */
class VerifyPrimaryAdminPasswordAction
{
    public const MAX_FAILURES = 5;

    public const MINUTES = 10;

    private const COUNTER_KEY = 'arca:console:primary-failures';

    private const LOCK_KEY = 'arca:console:primary-locked';

    public function __construct(private LogConsoleSecurityEventAction $log) {}

    public function isLocked(): bool
    {
        return Cache::has(self::LOCK_KEY);
    }

    public function verify(User $primary, string $password, ?string $targetEmail, string $command): bool
    {
        if (Hash::check($password, $primary->password)) {
            Cache::forget(self::COUNTER_KEY);

            return true;
        }

        $locked = Cache::lock('arca:console:primary-mutex', 5)->block(3, function () {
            Cache::add(self::COUNTER_KEY, 0, now()->addMinutes(self::MINUTES));
            $failures = (int) Cache::increment(self::COUNTER_KEY);

            if ($failures >= self::MAX_FAILURES) {
                Cache::put(self::LOCK_KEY, true, now()->addMinutes(self::MINUTES));
                Cache::forget(self::COUNTER_KEY);

                return true;
            }

            return false;
        });

        $this->log->execute('console-primary-password-failed', 'Contraseña del titular incorrecta en consola', $targetEmail, $command);

        if ($locked) {
            $this->log->execute('console-primary-locked', 'Comandos de nivel alto bloqueados por fallos de contraseña', $targetEmail, $command);
        }

        return false;
    }
}
