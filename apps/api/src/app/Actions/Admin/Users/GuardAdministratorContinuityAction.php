<?php

namespace App\Actions\Admin\Users;

use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Debe ejecutarse dentro de una transacción abierta por quien la invoca.
 */
class GuardAdministratorContinuityAction
{
    public function ensureNotSelf(User $actor, User $target, string $message): void
    {
        if ($actor->is($target)) {
            throw ValidationException::withMessages(['user' => [$message]]);
        }
    }

    public function ensureAnotherActiveAdmin(User $target): void
    {
        if (! $target->is_active || ! $target->hasRole('admin')) {
            return;
        }

        $others = User::query()
            ->role('admin')
            ->where('is_active', true)
            ->whereKeyNot($target->id)
            ->lockForUpdate()
            ->pluck('users.id');

        if ($others->isEmpty()) {
            throw ValidationException::withMessages([
                'user' => ['Debe existir al menos un administrador de Presidencia activo.'],
            ]);
        }
    }
}
