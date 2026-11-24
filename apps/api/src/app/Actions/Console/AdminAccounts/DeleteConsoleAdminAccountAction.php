<?php

namespace App\Actions\Console\AdminAccounts;

use App\Actions\Admin\Users\RevokeStaffSessionsAction;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Reglas y escritura de `arca:admin:delete` (api-023 CA-46): borrado lógico de una cuenta admin ya desactivada,
 * sin dejar cero administradores activos. Se invoca dentro de la transacción de `ApplyConsoleAdminChangeAction`.
 */
class DeleteConsoleAdminAccountAction
{
    public function __construct(private RevokeStaffSessionsAction $revoke) {}

    /** Mensaje de error si la cuenta aún no puede eliminarse; null si cumple las reglas. */
    public function blocker(User $user): ?string
    {
        if ($user->is_active) {
            return 'Desactiva la cuenta antes de eliminarla.';
        }

        if (! $this->anotherActiveAdminExists($user)) {
            return 'Debe existir al menos un administrador de Presidencia activo.';
        }

        return null;
    }

    /** Vuelve a validar con bloqueo de filas, invalida sesiones y tokens y borra lógicamente. */
    public function execute(User $user): User
    {
        $locked = User::query()->lockForUpdate()->findOrFail($user->id);

        if ($locked->is_active || ! $this->anotherActiveAdminExists($locked, true)) {
            throw ValidationException::withMessages(['user' => ['La cuenta cambió: vuelve a intentarlo.']]);
        }

        $this->revoke->execute($locked);
        $locked->tokens()->delete();
        $locked->delete();

        return $locked;
    }

    private function anotherActiveAdminExists(User $user, bool $lock = false): bool
    {
        $query = User::query()->role('admin')->where('is_active', true)->whereKeyNot($user->id);

        return ($lock ? $query->lockForUpdate() : $query)->exists();
    }
}
