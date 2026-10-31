<?php

namespace App\Actions\Admin\Users;

use App\Models\User;

class ResolveManageableRolesAction
{
    public const LABELS = [
        'admin' => 'Administrador de Presidencia',
        'zoo-admin' => 'Administrador del Zoológico',
        'executive' => 'Ejecutivo',
        'cashier' => 'Cajero',
        'veterinarian' => 'Veterinario',
    ];

    /**
     * @return list<string>
     */
    public function execute(User $actor): array
    {
        if ($actor->can('users.manage')) {
            return array_keys(self::LABELS);
        }

        if ($actor->can('operational-staff.manage')) {
            return ['cashier', 'veterinarian'];
        }

        return [];
    }
}
