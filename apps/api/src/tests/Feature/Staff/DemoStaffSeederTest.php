<?php

namespace Tests\Feature\Staff;

use App\Models\User;
use Database\Seeders\DemoStaffSeeder;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\FeatureTestCase;

class DemoStaffSeederTest extends FeatureTestCase
{
    /** arca_pruebas puede traer cuentas demo eliminadas con borrado lógico: dentro de la transacción de la prueba se quitan para partir de cero. */
    private function forgetDeletedDemoAccounts(): void
    {
        $this->assertGreaterThan(0, DB::transactionLevel());
        // No se borra físicamente (hay claves foráneas): se libera el correo, y todo se revierte al terminar.
        foreach (User::onlyTrashed()->where('email', 'like', '%@arca.local')->get() as $trashed) {
            DB::table('users')->where('id', $trashed->id)->update(['email' => "liberado-{$trashed->id}@trashed.invalid"]);
        }
    }

    /** CA-18 staff-authentication */
    public function test_ca18_staff_authentication_demo_seeder_is_idempotent_and_assigns_all_six_accounts(): void
    {
        (new DepartmentSeeder)->run();
        (new RolesAndPermissionsSeeder)->run();
        config(['arca.demo_staff_password' => 'SafePassphrase12!']);
        $this->forgetDeletedDemoAccounts();

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

    /** CA-18 staff-authentication: una cuenta demo eliminada con borrado lógico se respeta y el seeder no falla. */
    public function test_ca18_staff_authentication_demo_seeder_skips_soft_deleted_accounts(): void
    {
        (new DepartmentSeeder)->run();
        (new RolesAndPermissionsSeeder)->run();
        config(['arca.demo_staff_password' => 'SafePassphrase12!']);
        $this->forgetDeletedDemoAccounts();
        (new DemoStaffSeeder)->run();

        $deleted = User::query()->where('email', 'admin@arca.local')->firstOrFail();
        $deleted->delete();

        (new DemoStaffSeeder)->run();
        (new DemoStaffSeeder)->run();

        $this->assertNull(User::query()->where('email', 'admin@arca.local')->first());
        $this->assertNotNull(User::onlyTrashed()->where('email', 'admin@arca.local')->first());
        $this->assertSame(1, User::withTrashed()->where('email', 'admin@arca.local')->count());
        $this->assertSame(5, User::query()->whereIn('email', ['presidencia@arca.local', 'direccion_zoo@arca.local', 'ejecutivo@arca.local', 'boletaje@arca.local', 'veterinario@arca.local'])->count());
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
        (new DepartmentSeeder)->run();
        (new RolesAndPermissionsSeeder)->run();
        config(['arca.demo_staff_password' => 'SafePassphrase12!']);
        $this->app['env'] = 'production';

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('DemoStaffSeeder no se puede ejecutar en producción.');
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
        $this->expectExceptionMessage('DemoStaffSeeder no se puede ejecutar en arca_zoo.');
        $seeder->run();
    }
}
