<?php

namespace App\Policies;

use App\Actions\Admin\Users\ResolveManageableRolesAction;
use App\Models\User;

class UserPolicy
{
    public function view(User $actor, User $target): bool
    {
        return $this->manages($actor, $target);
    }

    public function update(User $actor, User $target): bool
    {
        return $this->manages($actor, $target);
    }

    public function delete(User $actor, User $target): bool
    {
        return $this->manages($actor, $target);
    }

    public function assignRole(User $actor, string $role): bool
    {
        return in_array($role, app(ResolveManageableRolesAction::class)->execute($actor), true);
    }

    private function manages(User $actor, User $target): bool
    {
        $roles = app(ResolveManageableRolesAction::class)->execute($actor);

        $names = $target->roles->pluck('name');

        return $names->isNotEmpty() && $names->diff($roles)->isEmpty();
    }
}
