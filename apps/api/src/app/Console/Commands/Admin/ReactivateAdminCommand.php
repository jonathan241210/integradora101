<?php

namespace App\Console\Commands\Admin;

/**
 * Nivel medio (api-023, revisión 2026-11-21): motivo y escribir el correo afectado.
 */
class ReactivateAdminCommand extends ConsoleAdminCommand
{
    /** Nivel de seguridad: lo lee `arca:admin:help` (api-023, revisión 2026-11-21 b). */
    public const LEVEL = 'medio';

    protected $signature = 'arca:admin:reactivate {email : Correo de la cuenta} {--r|reason= : Motivo del cambio (mínimo 10 caracteres)} {--y|yes : No sustituye escribir el correo de confirmación} {--c|confirm-email= : Correo afectado (sustituye escribirlo)}';

    protected $description = 'Reactiva una cuenta de administrador desactivada (nivel medio: motivo y escribir el correo)';

    public function handle(): int
    {
        $reason = $this->askReason();

        if ($reason === null) {
            return self::FAILURE;
        }

        $user = $this->findAdminAccount((string) $this->argument('email'));

        if ($user === null) {
            return self::FAILURE;
        }

        if ($user->is_active) {
            $this->error('La cuenta ya está activa.');

            return self::FAILURE;
        }

        $confirmed = $this->confirmChange([
            'Operación' => 'Reactivar cuenta de administrador',
            'Cuenta' => $user->email,
            'Motivo' => $reason,
        ], $user->email);

        if (! $confirmed) {
            return $this->declined();
        }

        return $this->applyChange('console-reactivated', 'Cuenta reactivada', $reason, function () use ($user) {
            $user->forceFill(['is_active' => true])->save();

            return $user;
        }, 'La cuenta %s quedó activa.');
    }
}
