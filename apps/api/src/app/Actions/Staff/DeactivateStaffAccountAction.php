<?php

namespace App\Actions\Staff;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DeactivateStaffAccountAction
{
    public function execute(User $user): void
    {
        DB::transaction(function () use ($user): void {
            $user->forceFill([
                'is_active' => false,
                'updated_by' => Auth::id(),
            ])->save();

            if (config('session.driver') === 'database') {
                DB::table('sessions')->where('user_id', $user->getKey())->delete();
            }

            if (method_exists($user, 'tokens')) {
                $user->tokens()->delete();
            }

            $user->delete();
        });
    }
}
