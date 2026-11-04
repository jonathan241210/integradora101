<?php

namespace Tests\Concerns;

use App\Models\Department;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Spatie\Permission\PermissionRegistrar;

trait CreatesAdministrators
{
    protected function seedRoles(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    protected function createAccount(string $role, bool $twoFactor = true, array $attributes = []): User
    {
        $this->seedRoles();

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

        if ($twoFactor) {
            $user->forceFill(['two_factor_confirmed_at' => now()])->save();
        }

        $user->assignRole($role);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $user;
    }
}
