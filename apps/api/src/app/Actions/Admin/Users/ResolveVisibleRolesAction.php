<?php

namespace App\Actions\Admin\Users;

use App\Models\User;
use App\Support\Staff\StaffRoleCatalog;

/**
 * Roles de cuentas que se pueden leer desde la API (api-023 CA-13): todos con `users.manage`.
 */
class ResolveVisibleRolesAction
{
    /**
     * @return list<string>
     */
    public function execute(User $actor): array
    {
        return $actor->can('users.manage') ? StaffRoleCatalog::roles() : [];
    }
}
