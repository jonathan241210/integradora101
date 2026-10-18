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
            'tickets.view',
            'tickets.create',
            'cash-closings.view',
            'cash-closings.create',
            'medical-records.view',
            'medical-records.create',
            'medical-records.update',
            'specimens.view',
            'specimens.update',
            'users.manage',
            'operational-staff.manage',
            'news.manage',
            'events.manage',
            'enclosures.manage',
            'public-content.view',
        ];

        $permissionModels = collect($permissions)
            ->mapWithKeys(fn (string $name) => [$name => Permission::findOrCreate($name, 'web')]);

        $roles = [
            'admin' => $permissions,
            'zoo-admin' => [
                'operational-staff.manage',
                'news.manage',
                'events.manage',
                'enclosures.manage',
                'dashboard.view',
                'reports.view',
                'tickets.view',
                'cash-closings.view',
                'public-content.view',
            ],
            'executive' => [
                'dashboard.view',
                'reports.view',
                'public-content.view',
            ],
            'cashier' => [
                'tickets.view',
                'tickets.create',
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
