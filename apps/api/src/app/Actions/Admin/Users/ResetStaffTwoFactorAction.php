<?php

namespace App\Actions\Admin\Users;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\Actions\DisableTwoFactorAuthentication;

class ResetStaffTwoFactorAction
{
    public function __construct(
        private DisableTwoFactorAuthentication $disable,
        private GuardAdministratorContinuityAction $guard,
        private RevokeStaffSessionsAction $revoke,
        private LogAdminActivityAction $log,
    ) {}

    public function execute(User $actor, User $target): void
    {
        $this->guard->ensureNotSelf($actor, $target, 'No puedes restablecer tu propio segundo factor desde la administración.');

        DB::transaction(function () use ($actor, $target) {
            ($this->disable)($target);
            $target->forceFill(['updated_by' => $actor->id])->saveQuietly();
            $this->revoke->execute($target);
        });

        $this->log->execute('two-factor-reset', 'Segundo factor restablecido', $target);
    }
}
