<?php

namespace Tests\Concerns;

use App\Models\Department;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

trait CreatesStaffUsers
{
    protected function createStaffUser(string $role = 'executive', array $attributes = []): User
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permission = Permission::firstOrCreate([
            'name' => 'public-content.view',
            'guard_name' => 'web',
        ]);
        $roleModel = Role::firstOrCreate([
            'name' => $role,
            'guard_name' => 'web',
        ]);
        $permissions = [$permission];
        if ($role === 'veterinarian') {
            // api-028: /staff/* exige medical-records.*; el rol real los tiene (RolesAndPermissionsSeeder).
            foreach (['medical-records.view', 'medical-records.create', 'medical-records.update'] as $name) {
                $permissions[] = Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
            }
        }
        $roleModel->syncPermissions($permissions);

        $department = Department::firstOrCreate(
            ['code' => 'test-department'],
            ['name' => 'Área de prueba', 'description' => null, 'is_active' => true],
        );

        $user = User::create(array_merge([
            'first_name' => 'Personal',
            'last_name' => 'Prueba',
            'second_last_name' => null,
            'email' => bin2hex(random_bytes(8)).'@test.arca.invalid',
            'password' => 'SafePassphrase12!',
            'department_id' => $department->id,
            'is_active' => true,
        ], $attributes));

        $user->assignRole($roleModel);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $user;
    }
}
