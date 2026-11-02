<?php

namespace App\Actions\Admin\Users;

use App\Actions\Admin\LogAdminActivityAction;
use App\Actions\Staff\CreateStaffAccountAction;
use App\Models\User;

class CreateManagedStaffAccountAction
{
    public function __construct(
        private CreateStaffAccountAction $create,
        private LogAdminActivityAction $log,
    ) {}

    public function execute(array $data): User
    {
        $user = $this->create->execute($data);

        $this->log->execute('created', 'Cuenta de personal creada', $user, [
            'role' => $data['role'],
            'department_id' => $user->department_id,
        ]);

        return $user->load(['department', 'roles']);
    }
}
