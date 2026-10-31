<?php

namespace App\Actions\Auth;

use App\Models\User;

class ResolveStaffHomeAction
{
    public function execute(User $user): ?string
    {
        foreach ([
            'admin' => 'administration',
            'zoo-admin' => 'administration',
            'executive' => 'executive',
            'cashier' => 'ticket',
            'veterinarian' => 'pwa',
        ] as $role => $home) {
            if ($user->hasRole($role)) {
                return $home;
            }
        }

        return null;
    }
}
