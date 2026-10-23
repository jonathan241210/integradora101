<?php

namespace App\Actions\Staff;

use App\Models\User;
use Spatie\Permission\Models\Role;

class ResolveManageableRolesAction
{
    /**
     * @return array<string>
     */
    public function execute(User $actor): array
    {
        if ($actor->can('users.manage')) {
            return Role::query()
                ->where('guard_name', 'web')
                ->orderBy('name')
                ->pluck('name')
                ->all();
        }

        if ($actor->can('operational-staff.manage')) {
            return ['cashier', 'veterinarian'];
        }

        return [];
    }
}
