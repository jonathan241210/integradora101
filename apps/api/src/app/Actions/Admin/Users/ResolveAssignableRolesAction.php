<?php

namespace App\Actions\Admin\Users;

use App\Models\User;
use App\Support\Staff\StaffRoleCatalog;

/**
 * Roles que se pueden asignar desde la API (api-023 RN-06): todos menos los de consola.
 */
class ResolveAssignableRolesAction
{
    /**
     * @return list<string>
     */
    public function execute(User $actor): array
    {
        if (! $actor->can('users.manage')) {
            return [];
        }

        return StaffRoleCatalog::assignableRoles();
    }
}
