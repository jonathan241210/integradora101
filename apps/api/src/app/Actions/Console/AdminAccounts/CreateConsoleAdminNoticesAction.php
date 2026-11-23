<?php

namespace App\Actions\Console\AdminAccounts;

use App\Models\StaffNotification;
use App\Models\User;

/**
 * Un aviso no leído por cada cuenta admin activa, calculado después de aplicar el cambio (api-023 RN-10, Q2).
 * Reutiliza `staff_notifications` con `created_by` nulo. Sin usuario del SO, servidor, contraseñas ni secretos.
 */
class CreateConsoleAdminNoticesAction
{
    public function execute(string $label, string $accountEmail, string $reason): int
    {
        $admins = User::query()->role('admin')->where('is_active', true)->get(['users.id']);

        foreach ($admins as $admin) {
            StaffNotification::query()->create([
                'user_id' => $admin->id,
                'type' => StaffNotification::TYPE_CONSOLE_ADMIN_CHANGE,
                'payload' => [
                    'action' => $label,
                    'account_email' => $accountEmail,
                    'origin' => 'consola',
                    'reason' => $reason,
                    'occurred_at' => now()->utc()->toIso8601String(),
                ],
                'ticket_price_id' => null,
                'created_by' => null,
            ]);
        }

        return $admins->count();
    }
}
