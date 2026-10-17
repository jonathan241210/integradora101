<?php

namespace Tests\Feature\Staff;

use App\Models\User;
use Database\Seeders\DemoStaffSeeder;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use RuntimeException;
use Tests\FeatureTestCase;

class DemoStaffSeederTest extends FeatureTestCase
{
    /** CA-18 staff-authentication */
    public function test_ca18_staff_authentication_demo_seeder_is_idempotent_and_assigns_all_six_accounts(): void
    {
        (new DepartmentSeeder)->run();
        (new RolesAndPermissionsSeeder)->run();
        config(['arca.demo_staff_password' => 'SafePassphrase12!']);

        (new DemoStaffSeeder)->run();
        (new DemoStaffSeeder)->run();

        $expected = [
            'presidencia@arca.local' => 'admin',
            'admin@arca.local' => 'admin',
            'direccion_zoo@arca.local' => 'zoo-admin',
            'ejecutivo@arca.local' => 'executive',
            'boletaje@arca.local' => 'cashier',
            'veterinario@arca.local' => 'veterinarian',
        ];

        foreach ($expected as $email => $role) {
            $user = User::query()->where('email', $email)->firstOrFail();
            $this->assertSame([$role], $user->getRoleNames()->all());
            $this->assertTrue(password_verify('SafePassphrase12!', $user->password));
        }

        $this->assertSame(6, User::query()->whereIn('email', array_keys($expected))->count());
    }

    /** CA-18 staff-authentication */
    public function test_ca18_staff_authentication_demo_seeder_aborts_before_creating_accounts_when_password_is_missing_or_weak(): void
    {
        $initialCount = User::query()->count();

        foreach ([null, 'weak'] as $password) {
            config(['arca.demo_staff_password' => $password]);
            try {
                (new DemoStaffSeeder)->run();
                $this->fail('El seeder debía rechazar una contraseña no válida.');
            } catch (RuntimeException) {
                $this->assertSame($initialCount, User::query()->count());
            }
        }
    }

    /** CA-18 staff-authentication */
    public function test_ca18_staff_authentication_demo_seeder_aborts_in_production(): void
    {
        config([
            'app.env' => 'production',
            'arca.demo_staff_password' => 'SafePassphrase12!',
        ]);

        $this->expectException(RuntimeException::class);
        (new DemoStaffSeeder)->run();
    }

    /** CA-18 staff-authentication */
    public function test_ca18_staff_authentication_demo_seeder_aborts_for_arca_zoo_without_connecting_to_it(): void
    {
        config(['arca.demo_staff_password' => 'SafePassphrase12!']);
        $seeder = new class extends DemoStaffSeeder
        {
            protected function activeDatabaseName(): string
            {
                return 'arca_zoo';
            }
        };

        $this->expectException(RuntimeException::class);
        $seeder->run();
    }
}
