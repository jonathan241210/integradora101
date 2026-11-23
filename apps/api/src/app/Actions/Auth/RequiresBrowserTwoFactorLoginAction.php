<?php

namespace App\Actions\Auth;

use App\Models\User;
use Laravel\Sanctum\TransientToken;

/**
 * Regla de api-021 CA-42 (RN-19): las cuentas con un rol de `config('arca.two_factor_roles')` solo operan con
 * sesión de navegador y reto de segundo factor (`/api/v1/auth/login`); no pueden usar tokens Sanctum de personal.
 */
class RequiresBrowserTwoFactorLoginAction
{
    public const CODE = 'two_factor_login_required';

    public const MESSAGE = 'Esta cuenta debe iniciar sesión desde el panel con su segundo factor.';

    /** ¿La cuenta tiene un rol que exige 2FA y, por tanto, no puede obtener un token de personal? */
    public function forRole(User $user): bool
    {
        return $user->hasAnyRole(config('arca.two_factor_roles', []));
    }

    /** ¿La petición llega con un token personal (no con la sesión de navegador) de una cuenta con rol de 2FA? */
    public function forPersonalAccessToken(User $user): bool
    {
        $token = $user->currentAccessToken();

        return $token !== null
            && ! $token instanceof TransientToken
            && $this->forRole($user);
    }
}
