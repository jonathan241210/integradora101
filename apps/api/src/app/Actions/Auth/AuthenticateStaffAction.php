<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthenticateStaffAction
{
    public function execute(Request $request): ?User
    {
        $email = mb_strtolower(trim((string) $request->input('email')));
        $password = (string) $request->input('password');

        $user = User::query()
            ->where('email', $email)
            ->where('is_active', true)
            ->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            return null;
        }

        return $user;
    }
}
