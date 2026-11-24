<?php

namespace App\Console\Commands\Admin;

use App\Actions\Console\AdminAccounts\DeleteConsoleAdminAccountAction;

/**
 * Nivel alto (api-023, revisión 2026-11-21): borrado lógico (SoftDeletes) de una cuenta admin ya desactivada.
 * Conserva auditoría y relaciones; no borra nada físico.
 */
class DeleteAdminCommand extends ConsoleAdminCommand
{
    /** Nivel de seguridad: lo lee `arca:admin:help` (api-023, revisión 2026-11-21 b). */
    public const LEVEL = 'alto';

    protected $signature = 'arca:admin:delete {email : Correo de la cuenta} {--r|reason= : Motivo del cambio (mínimo 10 caracteres)} {--y|yes : Confirma sin preguntar}';

    protected $description = 'Elimina (borrado lógico) una cuenta de administrador desactivada (nivel alto: pide la contraseña del titular)';

    public function handle(DeleteConsoleAdminAccountAction $delete): int
    {
        $reason = $this->askReason();

        if ($reason === null) {
            return self::FAILURE;
        }

        $user = $this->findAdminAccount((string) $this->argument('email'));

        if ($user === null || $this->rejectPrimaryTarget($user)) {
            return self::FAILURE;
        }

        $blocker = $delete->blocker($user);

        if ($blocker !== null) {
            $this->error($blocker);

            return self::FAILURE;
        }

        if ($this->authorizeHighLevel('arca:admin:delete', $user->email) === null) {
            return self::FAILURE;
        }

        $confirmed = $this->confirmChange([
            'Operación' => 'Eliminar cuenta de administrador (borrado lógico)',
            'Cuenta' => $user->email,
            'Motivo' => $reason,
        ]);

        if (! $confirmed) {
            return self::SUCCESS;
        }

        return $this->applyChange('console-deleted', 'Cuenta eliminada', $reason, fn () => $delete->execute($user), 'La cuenta %s quedó eliminada (borrado lógico); sus sesiones y tokens se invalidaron.');
    }
}
