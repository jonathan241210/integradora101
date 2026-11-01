<?php

namespace App\Actions\Admin\Users;

use App\Models\User;

class FindManageableStaffAccountAction
{
    public function __construct(private ResolveManageableRolesAction $roles) {}

    public function execute(User $actor, string $id): User
    {
        abort_unless(ctype_digit($id), 404, 'Usuario no encontrado.');

        $user = User::query()
            ->manageableWith($this->roles->execute($actor))
            ->with(['department', 'roles'])
            ->find((int) $id);

        abort_if($user === null, 404, 'Usuario no encontrado.');

        return $user;
    }
}
