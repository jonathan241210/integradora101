<?php

namespace App\Console\Commands\Admin;

use App\Actions\Admin\Users\GuardAdministratorContinuityAction;
use App\Models\User;
use App\Support\Staff\StaffRoleCatalog;

use function Laravel\Prompts\select;

/**
 * Nivel alto (api-023, revisión 2026-11-21): quita el rol admin y asigna un rol no admin obligatorio.
 */
class DemoteAdminCommand extends ConsoleAdminCommand
{
    /** Nivel de seguridad: lo lee `arca:admin:help` (api-023, revisión 2026-11-21 b). */
    public const LEVEL = 'alto';

    protected $signature = 'arca:admin:demote {email : Correo de la cuenta} {--role= : Rol nuevo (no admin)} {--r|reason= : Motivo del cambio (mínimo 10 caracteres)} {--y|yes : Confirma sin preguntar}';

    protected $description = 'Quita el rol de administrador y asigna otro rol (nivel alto: pide la contraseña del titular)';

    public function handle(GuardAdministratorContinuityAction $guard): int
    {
        $reason = $this->askReason();

        if ($reason === null) {
            return self::FAILURE;
        }

        $user = $this->findAdminAccount((string) $this->argument('email'));

        if ($user === null || $this->rejectPrimaryTarget($user)) {
            return self::FAILURE;
        }

        $roles = StaffRoleCatalog::assignableRoles();
        $role = $this->option('role');

        if (($role === null || $role === '') && $this->input->isInteractive()) {
            $role = select(label: 'Rol nuevo', options: $roles);
        }

        if (! is_string($role) || ! in_array($role, $roles, true)) {
            $this->error('Indica un rol nuevo válido con --role: '.implode(', ', $roles).'.');

            return self::FAILURE;
        }

        if ($this->authorizeHighLevel('arca:admin:demote', $user->email) === null) {
            return self::FAILURE;
        }

        $confirmed = $this->confirmChange([
            'Operación' => 'Quitar el rol de administrador',
            'Cuenta' => $user->email,
            'Rol nuevo' => $role,
            'Motivo' => $reason,
        ]);

        if (! $confirmed) {
            return self::SUCCESS;
        }

        return $this->applyChange('console-demoted', 'Rol de administrador retirado', $reason, function () use ($user, $role, $guard) {
            $locked = User::query()->lockForUpdate()->findOrFail($user->id);
            $guard->ensureAnotherActiveAdmin($locked);
            $locked->syncRoles([$role]);

            return $locked;
        }, 'La cuenta %s ya no es administrador.');
    }
}
