<?php

namespace Tests\Feature\Staff;

use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Http;
use Tests\FeatureTestCase;

class CreateStaffCommandTest extends FeatureTestCase
{
    /** CA-14 staff-authentication */
    public function test_ca14_staff_authentication_interactive_command_creates_an_account_with_suggested_role(): void
    {
        (new DepartmentSeeder)->run();
        (new RolesAndPermissionsSeeder)->run();
        Http::fake(['api.pwnedpasswords.com/range/*' => Http::response('', 200)]);

        $password = 'SafePassphrase12!';
        $email = 'staff-'.bin2hex(random_bytes(8)).'@test.arca.invalid';
        $this->artisan('arca:create-staff')
            ->expectsQuestion('Correo institucional', $email)
            ->expectsQuestion('Nombre', 'Alicia')
            ->expectsQuestion('Primer apellido', 'Prueba')
            ->expectsQuestion('Segundo apellido', 'Personal')
            ->expectsChoice('Área', 'Dirección', [
                'Dirección',
                'Informática',
                'Presidencia',
                'Servicios veterinarios',
                'Taquilla',
            ])
            ->expectsChoice('Rol (sugerido por área, editable)', 'zoo-admin', [
                'admin',
                'cashier',
                'executive',
                'veterinarian',
                'zoo-admin',
            ])
            ->expectsQuestion('Contraseña', $password)
            ->expectsQuestion('Confirma la contraseña', $password)
            ->assertExitCode(0);

        $user = User::query()->where('first_name', 'Alicia')->firstOrFail();

        $this->assertSame(['zoo-admin'], $user->getRoleNames()->all());
        $this->assertSame('management', $user->department->code);
        $this->assertTrue(password_verify($password, $user->password));
    }
}
