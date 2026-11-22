<?php

namespace App\Console\Commands\Admin;

use App\Actions\Admin\Users\GuardAdministratorContinuityAction;
use App\Actions\Admin\Users\RevokeStaffSessionsAction;
use App\Models\User;

class DeactivateAdminCommand extends ConsoleAdminCommand
{
    /** Nivel de seguridad: lo lee `arca:admin:help` (api-023, revisión 2026-11-21 b). */
    public const LEVEL = 'alto';

    protected $signature = 'arca:admin:deactivate {email : Correo de la cuenta} {--r|reason= : Motivo del cambio (mínimo 10 caracteres)} {--y|yes : Confirma sin preguntar}';

    protected $description = 'Desactiva una cuenta de administrador e invalida sus sesiones (nivel alto: pide la contraseña del titular)';

    public function handle(GuardAdministratorContinuityAction $guard, RevokeStaffSessionsAction $revoke): int
    {
        $reason = $this->askReason();

        if ($reason === null) {
            return self::FAILURE;
        }

        $user = $this->findAdminAccount((string) $this->argument('email'));

        if ($user === null) {
            return self::FAILURE;
        }

        if (! $user->is_active) {
            $this->error('La cuenta ya está desactivada.');

            return self::FAILURE;
        }

        if ($this->rejectPrimaryTarget($user) || $this->authorizeHighLevel('arca:admin:deactivate', $user->email) === null) {
            return self::FAILURE;
        }

        $confirmed = $this->confirmChange([
            'Operación' => 'Desactivar cuenta de administrador',
            'Cuenta' => $user->email,
            'Motivo' => $reason,
        ]);

        if (! $confirmed) {
            return self::SUCCESS;
        }

        return $this->applyChange('console-deactivated', 'Cuenta desactivada', $reason, function () use ($user, $guard, $revoke) {
            $locked = User::query()->lockForUpdate()->findOrFail($user->id);

            // RN-11: nunca queda cero administradores activos.
            $guard->ensureAnotherActiveAdmin($locked);

            $locked->forceFill(['is_active' => false])->save();
            $revoke->execute($locked);

            return $locked;
        }, 'La cuenta %s quedó desactivada y sus sesiones se invalidaron.');
    }
}
