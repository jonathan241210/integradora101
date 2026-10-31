<?php

namespace App\Actions\Admin\Users;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SetStaffAccountStatusAction
{
    public function __construct(
        private GuardAdministratorContinuityAction $guard,
        private RevokeStaffSessionsAction $revoke,
        private LogAdminActivityAction $log,
    ) {}

    public function execute(User $actor, User $target, bool $active): User
    {
        DB::transaction(function () use ($actor, $target, $active) {
            $locked = User::query()->lockForUpdate()->findOrFail($target->id);

            if (! $active) {
                $this->guard->ensureNotSelf($actor, $locked, 'No puedes desactivar tu propia cuenta.');
                $this->guard->ensureAnotherActiveAdmin($locked);
            }

            $locked->forceFill(['is_active' => $active, 'updated_by' => $actor->id])->save();

            if (! $active) {
                $this->revoke->execute($locked);
            }
        });

        $target = $target->fresh(['department', 'roles']);
        $this->log->execute('status-changed', $active ? 'Cuenta activada' : 'Cuenta desactivada', $target, ['is_active' => $active]);

        return $target;
    }
}
