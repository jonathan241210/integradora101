<?php

namespace App\Actions\Auth\StepUp;

use App\Exceptions\PasswordAttemptsExceededException;
use App\Exceptions\PasswordIncorrectException;
use App\Models\User;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

/**
 * Única verificación de contraseña de la API de personal para ventana y «Siempre» (api-021 RN-05, RN-07).
 * Orden: bloqueo, comparación, contador y auditoría. Un candado por usuario serializa el ciclo completo para que
 * peticiones simultáneas no superen el límite de intentos.
 */
class VerifyStaffPasswordAction
{
    private const LOCK_SECONDS = 10;

    public function __construct(
        private PasswordAttemptLimiter $limiter,
        private LogPasswordConfirmationAction $log,
    ) {}

    /**
     * @throws PasswordAttemptsExceededException
     * @throws PasswordIncorrectException
     */
    public function execute(User $user, string $password, Request $request, string $mode): void
    {
        try {
            Cache::lock("password-confirmation:verify:{$user->id}", self::LOCK_SECONDS)
                ->block(self::LOCK_SECONDS, fn () => $this->verify($user, $password, $request, $mode));
        } catch (LockTimeoutException) {
            throw new PasswordAttemptsExceededException(self::LOCK_SECONDS);
        }
    }

    private function verify(User $user, string $password, Request $request, string $mode): void
    {
        $locked = $this->limiter->lockedSeconds($user->id);

        if ($locked > 0) {
            // Solo el primer intento bloqueado de cada periodo de bloqueo se audita; el resto solo responde 429.
            if ($this->limiter->markLockedAttemptLogged($user->id, $locked)) {
                $this->log->execute($user, $request, $mode, 'failed', locked: true);
            }

            throw new PasswordAttemptsExceededException($locked);
        }

        if (! Hash::check($password, $user->password)) {
            $this->limiter->recordFailure($user->id);
            $this->log->execute($user, $request, $mode, 'failed');

            throw new PasswordIncorrectException;
        }

        $this->limiter->clearFailures($user->id);
        $this->log->execute($user, $request, $mode, 'succeeded');
    }
}
