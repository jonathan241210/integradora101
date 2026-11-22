<?php

namespace App\Console\Commands\Admin;

/**
 * Nivel alto (api-023, revisión 2026-11-21): motivo y contraseña del admin titular.
 */
class PromoteAdminCommand extends ConsoleAdminCommand
{
    /** Nivel de seguridad: lo lee `arca:admin:help` (api-023, revisión 2026-11-21 b). */
    public const LEVEL = 'alto';

    protected $signature = 'arca:admin:promote {email : Correo de la cuenta} {--r|reason= : Motivo del cambio (mínimo 10 caracteres)} {--y|yes : Confirma sin preguntar}';

    protected $description = 'Convierte una cuenta de personal activa en administrador (nivel alto: pide la contraseña del titular)';

    public function handle(): int
    {
        $reason = $this->askReason();

        if ($reason === null) {
            return self::FAILURE;
        }

        $user = $this->findAccount((string) $this->argument('email'));

        if ($user === null) {
            return self::FAILURE;
        }

        if ($user->trashed()) {
            $this->error('La cuenta está eliminada: no se puede promover.');

            return self::FAILURE;
        }

        if (! $user->is_active) {
            $this->error('La cuenta está inactiva: actívala antes de promoverla.');

            return self::FAILURE;
        }

        if ($user->hasRole('admin')) {
            $this->error('La cuenta ya es de administrador.');

            return self::FAILURE;
        }

        if ($this->authorizeHighLevel('arca:admin:promote', $user->email) === null) {
            return self::FAILURE;
        }

        $confirmed = $this->confirmChange([
            'Operación' => 'Promover a administrador',
            'Cuenta' => $user->email,
            'Rol actual' => $user->getRoleNames()->implode(', ') ?: 'sin rol',
            'Rol nuevo' => 'admin',
            'Motivo' => $reason,
        ]);

        if (! $confirmed) {
            return self::SUCCESS;
        }

        // Un único rol (admin); conserva área, datos y sesiones (CA-22).
        return $this->applyChange('console-promoted', 'Cuenta promovida a administrador', $reason, function () use ($user) {
            $user->syncRoles(['admin']);

            return $user;
        }, 'La cuenta %s ahora es de administrador. Debe configurar el segundo factor si no lo tiene.');
    }
}
