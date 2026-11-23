<?php

namespace App\Console\Commands\Admin;

use App\Actions\Admin\Users\RevokeStaffSessionsAction;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\password as promptPassword;

class ResetAdminPasswordCommand extends ConsoleAdminCommand
{
    /** Nivel de seguridad: lo lee `arca:admin:help` (api-023, revisión 2026-11-21 b). */
    public const LEVEL = 'alto';

    protected $signature = 'arca:admin:reset-password {email : Correo de la cuenta} {--r|reason= : Motivo del cambio (mínimo 10 caracteres)} {--y|yes : Confirma sin preguntar (nivel alto)} {--c|confirm-email= : Correo afectado, solo en modo recuperación}';

    protected $description = 'Restablece la contraseña de una cuenta de administrador (nivel alto: pide la contraseña del titular)';

    public function handle(RevokeStaffSessionsAction $revoke): int
    {
        if ($this->rejectWithoutTerminal()) {
            return self::FAILURE;
        }

        $reason = $this->askReason();

        if ($reason === null) {
            return self::FAILURE;
        }

        $user = $this->findAdminAccount((string) $this->argument('email'));

        if ($user === null) {
            return self::FAILURE;
        }

        $recovery = $this->recoveryAppliesTo($user);
        $mode = $this->authorizeHighLevel('arca:admin:reset-password', $user->email, $recovery);

        if ($mode === null) {
            return self::FAILURE;
        }

        $password = promptPassword(
            label: 'Contraseña nueva',
            validate: fn (string $value) => Validator::make(
                ['password' => $value],
                ['password' => ['required', Password::defaults()]],
            )->errors()->first('password') ?: null,
        );

        if (! hash_equals($password, promptPassword('Confirma la contraseña nueva'))) {
            $this->error('Las contraseñas no coinciden.');

            return self::FAILURE;
        }

        $confirmed = $this->confirmChange([
            'Operación' => 'Restablecer contraseña de administrador',
            'Cuenta' => $user->email,
            'Motivo' => $reason,
        ], $mode === self::MODE_RECOVERY ? $user->email : null);

        if (! $confirmed) {
            return $this->declined();
        }

        return $this->applyChange($mode === self::MODE_RECOVERY ? 'console-recovery-password-reset' : 'console-password-reset', ($mode === self::MODE_RECOVERY ? 'Recuperación: ' : '').'Contraseña restablecida', $reason, function () use ($user, $password, $revoke) {
            // El cast `hashed` del modelo guarda bcrypt; la contraseña nunca se registra.
            $user->forceFill(['password' => $password])->save();
            $revoke->execute($user);

            return $user;
        }, 'Contraseña de %s restablecida y sus sesiones invalidadas.', $mode === self::MODE_RECOVERY ? 'recuperación' : null);
    }
}
