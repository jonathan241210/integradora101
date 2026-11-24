<?php

namespace App\Actions\Console\AdminAccounts;

use App\Models\User;

/**
 * Admin titular de la consola (api-023, revisión 2026-11-21): el correo de `config('arca.primary_admin_email')`
 * debe ser un administrador activo y no eliminado.
 */
class ResolvePrimaryAdminAction
{
    public const PROTECTED_MESSAGE = 'Primero cambia ARCA_PRIMARY_ADMIN_EMAIL a otro administrador.';

    public function email(): ?string
    {
        $email = config('arca.primary_admin_email');

        return is_string($email) && trim($email) !== '' ? mb_strtolower(trim($email)) : null;
    }

    public function isPrimaryEmail(string $email): bool
    {
        $primary = $this->email();

        return $primary !== null && $primary === mb_strtolower(trim($email));
    }

    /** @return array{0: ?User, 1: ?string} titular activo o el mensaje de error en español */
    public function resolve(): array
    {
        $email = $this->email();

        if ($email === null) {
            return [null, 'No hay administrador titular configurado: define ARCA_PRIMARY_ADMIN_EMAIL con un administrador activo.'];
        }

        $user = User::query()->role('admin')->where('email', $email)->where('is_active', true)->first();

        if ($user === null) {
            return [null, 'El correo de ARCA_PRIMARY_ADMIN_EMAIL no es un administrador activo.'];
        }

        return [$user, null];
    }
}
