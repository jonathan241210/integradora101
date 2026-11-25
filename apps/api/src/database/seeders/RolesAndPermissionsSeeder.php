<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'dashboard.view',
            'reports.view',
            'reports.cancellations.view',
            'tickets.view',
            'tickets.view-all',
            'tickets.create',
            'tickets.cancel',
            'ticket-prices.manage',
            'cash-closings.view',
            'cash-closings.create',
            'medical-records.view',
            'medical-records.create',
            'medical-records.update',
            'specimens.view',
            'specimens.update',
            'animals.update',
            'users.manage',
            'news.manage',
            'events.manage',
            'enclosures.manage',
            'public-content.view',
            'species.review',
            'memories.review',
        ];

        $permissionModels = collect($permissions)
            ->mapWithKeys(fn (string $name) => [$name => Permission::findOrCreate($name, 'web')]);

        $roles = [
            // Only the box office sells and cancels tickets; admin manages prices. `tickets.view-all` lo recibe por array_diff.
            'admin' => array_values(array_diff($permissions, ['tickets.create', 'tickets.cancel', 'species.review', 'memories.review'])),
            'zoo-admin' => [
                'news.manage',
                'events.manage',
                'enclosures.manage',
                'dashboard.view',
                'reports.view',
                'tickets.view',
                'tickets.view-all',
                'cash-closings.view',
                'public-content.view',
                'species.review',
                'memories.review',
            ],
            'executive' => [
                'dashboard.view',
                'reports.view',
                'public-content.view',
            ],
            // api-023: contenido público; sin panel, reportes ni cuentas.
            'communications' => [
                'news.manage',
                'events.manage',
                'memories.review',
                'species.review',
                'public-content.view',
            ],
            'cashier' => [
                'tickets.view',
                'tickets.create',
                'tickets.cancel',
                'cash-closings.view',
                'cash-closings.create',
                'public-content.view',
            ],
            'veterinarian' => [
                'medical-records.view',
                'medical-records.create',
                'medical-records.update',
                'specimens.view',
                'specimens.update',
                'animals.update',
                'public-content.view',
            ],
        ];

        foreach ($roles as $name => $permissionNames) {
            $role = Role::findOrCreate($name, 'web');
            $role->syncPermissions($permissionModels->only($permissionNames)->values());
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
