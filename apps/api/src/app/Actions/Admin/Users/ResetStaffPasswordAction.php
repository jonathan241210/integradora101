<?php

namespace App\Actions\Admin\Users;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ResetStaffPasswordAction
{
    public function __construct(
        private GuardAdministratorContinuityAction $guard,
        private RevokeStaffSessionsAction $revoke,
        private LogAdminActivityAction $log,
    ) {}

    public function execute(User $actor, User $target, string $password): void
    {
        $this->guard->ensureNotSelf($actor, $target, 'No puedes restablecer tu propia contraseña desde la administración.');

        DB::transaction(function () use ($actor, $target, $password) {
            $target->forceFill(['password' => $password, 'updated_by' => $actor->id])->save();
            $this->revoke->execute($target);
        });

        $this->log->execute('password-reset', 'Contraseña restablecida', $target);
    }
}
