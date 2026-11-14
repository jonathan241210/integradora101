<?php

namespace Tests\Concerns;

use Database\Seeders\RolesAndPermissionsSeeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Seeds roles and permissions only when something is missing, and at most once per test.
 * The seeder rewrites role_has_permissions, which deadlocks when several sessions share arca_pruebas.
 */
trait SeedsRolesWhenMissing
{
    private bool $rolesReady = false;

    protected function seedRolesWhenMissing(): void
    {
        if ($this->rolesReady) {
            return;
        }

        $names = ['admin', 'zoo-admin', 'executive', 'cashier', 'veterinarian'];
        $roles = Role::query()->where('guard_name', 'web')->whereIn('name', $names)->get();
        $zooAdmin = $roles->firstWhere('name', 'zoo-admin');

        $complete = $roles->count() === count($names)
            && Permission::query()->where('guard_name', 'web')->where('name', 'species.review')->exists()
            && $zooAdmin?->permissions()->where('name', 'species.review')->exists();

        if (! $complete) {
            $this->seed(RolesAndPermissionsSeeder::class);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->rolesReady = true;
    }
}
