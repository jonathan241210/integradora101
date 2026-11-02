<?php

namespace App\Actions\Admin\Users;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RevokeStaffSessionsAction
{
    public function execute(User $user): void
    {
        DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();

        $user->forceFill(['remember_token' => Str::random(60)])->saveQuietly();
    }
}
