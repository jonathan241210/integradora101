<?php

namespace App\Policies;

use App\Actions\Staff\ResolveManageableRolesAction;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class StaffUserPolicy
{
    public function __construct(
        private readonly ResolveManageableRolesAction $manageableRoles,
    ) {}

    public function viewAny(User $actor): bool
    {
        return $this->canManageUsers($actor);
    }

    public function create(User $actor): bool
    {
        return $this->canManageUsers($actor);
    }

    public function update(User $actor, User $staffUser): Response
    {
        return $this->canManageAccount($actor, $staffUser)
            ? Response::allow()
            : Response::deny('No puedes administrar esta cuenta.');
    }

    public function delete(User $actor, User $staffUser): Response
    {
        if ($actor->is($staffUser)) {
            return Response::deny('No puedes desactivar tu propia cuenta.');
        }

        return $this->canManageAccount($actor, $staffUser)
            ? Response::allow()
            : Response::deny('No puedes administrar esta cuenta.');
    }

    public function assignRole(User $actor, User|string $targetOrRole, ?string $role = null): Response
    {
        $staffUser = $targetOrRole instanceof User ? $targetOrRole : null;
        $roleName = $staffUser ? $role : $targetOrRole;

        if ($staffUser && $actor->is($staffUser)) {
            return Response::deny('No puedes cambiar tu propio rol.');
        }

        if ($staffUser && ! $this->canManageAccount($actor, $staffUser)) {
            return Response::deny('No puedes administrar esta cuenta.');
        }

        return in_array($roleName, $this->manageableRoles->execute($actor), true)
            ? Response::allow()
            : Response::deny('No puedes asignar ese rol.');
    }

    private function canManageUsers(User $actor): bool
    {
        return $actor->can('users.manage') || $actor->can('operational-staff.manage');
    }

    private function canManageAccount(User $actor, User $staffUser): bool
    {
        if (! $this->canManageUsers($actor)) {
            return false;
        }

        if ($actor->can('users.manage')) {
            return true;
        }

        $roles = $staffUser->getRoleNames()->all();
        $manageableRoles = $this->manageableRoles->execute($actor);

        return $roles !== [] && count(array_diff($roles, $manageableRoles)) === 0;
    }
}
