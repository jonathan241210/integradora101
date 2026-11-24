<?php

namespace App\Console\Commands\Admin;

use App\Actions\Admin\Users\RevokeStaffSessionsAction;
use Laravel\Fortify\Actions\DisableTwoFactorAuthentication;

class ResetAdminTwoFactorCommand extends ConsoleAdminCommand
{
    /** Nivel de seguridad: lo lee `arca:admin:help` (api-023, revisión 2026-11-21 b). */
    public const LEVEL = 'medio';

    protected $signature = 'arca:admin:reset-two-factor {email : Correo de la cuenta} {--r|reason= : Motivo del cambio (mínimo 10 caracteres)} {--y|yes : No sustituye escribir el correo de confirmación} {--c|confirm-email= : Correo afectado (sustituye escribirlo)}';

    protected $description = 'Restablece el segundo factor de una cuenta de administrador (nivel medio: motivo y escribir el correo)';

    public function handle(DisableTwoFactorAuthentication $disable, RevokeStaffSessionsAction $revoke): int
    {
        $reason = $this->askReason();

        if ($reason === null) {
            return self::FAILURE;
        }

        $user = $this->findAdminAccount((string) $this->argument('email'));

        if ($user === null) {
            return self::FAILURE;
        }

        $confirmed = $this->confirmChange([
            'Operación' => 'Restablecer segundo factor de administrador',
            'Cuenta' => $user->email,
            'Motivo' => $reason,
        ], $user->email);

        if (! $confirmed) {
            return $this->declined();
        }

        return $this->applyChange('console-two-factor-reset', 'Segundo factor restablecido', $reason, function () use ($user, $disable, $revoke) {
            // Borra secreto, códigos de recuperación y confirmación; su siguiente inicio exige configurarlo (CA-23).
            $disable($user);
            $revoke->execute($user);

            return $user;
        }, 'Segundo factor de %s restablecido y sus sesiones invalidadas.');
    }
}
