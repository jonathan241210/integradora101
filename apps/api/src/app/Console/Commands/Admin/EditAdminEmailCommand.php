<?php

namespace App\Console\Commands\Admin;

use App\Actions\Admin\Users\RevokeStaffSessionsAction;
use App\Actions\Console\AdminAccounts\ResolvePrimaryAdminAction;
use App\Models\User;

use function Laravel\Prompts\text;

/**
 * Nivel medio (api-023, revisión 2026-11-21): motivo y escribir el correo afectado. Sobre el titular se permite y
 * avisa de actualizar ARCA_PRIMARY_ADMIN_EMAIL.
 */
class EditAdminEmailCommand extends ConsoleAdminCommand
{
    /** Nivel de seguridad: lo lee `arca:admin:help` (api-023, revisión 2026-11-21 b). */
    public const LEVEL = 'medio';

    protected $signature = 'arca:admin:edit-email {email : Correo actual de la cuenta} {--new-email= : Correo nuevo} {--r|reason= : Motivo del cambio (mínimo 10 caracteres)} {--y|yes : No sustituye escribir el correo de confirmación} {--c|confirm-email= : Correo afectado (sustituye escribirlo)}';

    protected $description = 'Cambia el correo de una cuenta de administrador (nivel medio: motivo y escribir el correo)';

    public function handle(RevokeStaffSessionsAction $revoke): int
    {
        $reason = $this->askReason();

        if ($reason === null) {
            return self::FAILURE;
        }

        $user = $this->findAdminAccount((string) $this->argument('email'));

        if ($user === null) {
            return self::FAILURE;
        }

        $new = $this->option('new-email');

        if (($new === null || $new === '') && $this->input->isInteractive()) {
            $new = text('Correo nuevo', required: true);
        }

        $new = mb_strtolower(trim((string) $new));

        if ($new === '' || ! filter_var($new, FILTER_VALIDATE_EMAIL) || mb_strlen($new) > 255) {
            $this->error('Escribe un correo nuevo válido.');

            return self::FAILURE;
        }

        if ($new === $user->email) {
            $this->error('El correo nuevo es igual al actual.');

            return self::FAILURE;
        }

        if (User::withTrashed()->where('email', $new)->exists()) {
            $this->error('El correo ya está registrado (incluidas cuentas eliminadas).');

            return self::FAILURE;
        }

        $wasPrimary = app(ResolvePrimaryAdminAction::class)->isPrimaryEmail($user->email);
        $old = $user->email;

        $confirmed = $this->confirmChange([
            'Operación' => 'Cambiar correo de administrador',
            'Cuenta' => $old,
            'Correo nuevo' => $new,
            'Motivo' => $reason,
        ], $old);

        if (! $confirmed) {
            return $this->declined();
        }

        $code = $this->applyChange('console-email-edited', 'Correo actualizado', $reason, function () use ($user, $new, $revoke) {
            $user->forceFill(['email' => $new])->save();
            // El correo es la identidad de la cuenta: se invalidan sesiones y tokens como en reset-password.
            $revoke->execute($user);
            $user->tokens()->delete();

            return $user;
        }, 'Correo actualizado a %s; sus sesiones y tokens se invalidaron.');

        if ($code === self::SUCCESS && $wasPrimary) {
            $this->warn('Actualiza ARCA_PRIMARY_ADMIN_EMAIL en el .env');
        }

        return $code;
    }
}
