<?php

namespace App\Actions\Auth;

use App\Models\User;

/**
 * Inicio del personal por permiso, no por nombre de rol (api-023 RN-03).
 */
class ResolveStaffHomeAction
{
    public function execute(User $user): string
    {
        if ($user->can('users.manage') || $user->can('enclosures.manage')) {
            return 'administration';
        }

        if ($user->can('dashboard.view')) {
            return 'executive';
        }

        if ($user->can('tickets.create')) {
            return 'ticket';
        }

        if ($user->can('medical-records.view')) {
            return 'pwa';
        }

        // Personal sin permiso de inicio propio (p. ej. `communications`): administración, sección Noticias.
        return 'administration';
    }
}
