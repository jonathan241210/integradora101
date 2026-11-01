<?php

namespace App\Actions\Admin\Users;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeleteStaffAccountAction
{
    public function __construct(
        private GuardAdministratorContinuityAction $guard,
        private RevokeStaffSessionsAction $revoke,
        private LogAdminActivityAction $log,
    ) {}

    public function execute(User $actor, User $target): void
    {
        DB::transaction(function () use ($actor, $target) {
            $locked = User::query()->lockForUpdate()->findOrFail($target->id);

            $this->guard->ensureNotSelf($actor, $locked, 'No puedes eliminar tu propia cuenta.');
            $this->guard->ensureAnotherActiveAdmin($locked);

            $this->revoke->execute($locked);
            $locked->forceFill(['updated_by' => $actor->id])->saveQuietly();
            $locked->delete();
        });

        $this->log->execute('deleted', 'Cuenta de personal eliminada', $target, []);
    }
}
