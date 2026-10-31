<?php

namespace App\Actions\Admin\Users;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class UpdateStaffAccountAction
{
    public function __construct(
        private GuardAdministratorContinuityAction $guard,
        private LogAdminActivityAction $log,
    ) {}

    public function execute(User $actor, User $target, array $data): User
    {
        $changes = [];

        DB::transaction(function () use ($actor, $target, $data, &$changes) {
            $target = User::query()->lockForUpdate()->findOrFail($target->id);
            $newRole = $data['role'] ?? null;

            if ($newRole !== null && ! $target->hasRole($newRole)) {
                $this->guard->ensureNotSelf($actor, $target, 'No puedes cambiar tu propio rol.');
                $this->guard->ensureAnotherActiveAdmin($target);
                $target->syncRoles([$newRole]);
                $changes[] = 'role';
            }

            $target->fill(collect($data)->only(['first_name', 'last_name', 'second_last_name', 'department_id'])->all());
            $changes = array_merge($changes, array_keys($target->getDirty()));
            $target->updated_by = $actor->id;
            $target->save();
        });

        $target = $target->fresh(['department', 'roles']);
        $this->log->execute('updated', 'Cuenta de personal actualizada', $target, ['changed' => $changes]);

        return $target;
    }
}
