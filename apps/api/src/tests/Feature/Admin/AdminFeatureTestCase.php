<?php

namespace Tests\Feature\Admin;

use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\ConfirmsStepUp;
use Tests\Concerns\CreatesAdministrators;
use Tests\FeatureTestCase;

abstract class AdminFeatureTestCase extends FeatureTestCase
{
    use ConfirmsStepUp, CreatesAdministrators;

    /**
     * Sesión de navegador con una ventana de confirmación de contraseña vigente (api-021), para que las pruebas de
     * otras specs no tengan que repetir la confirmación. Las pruebas de api-021 usan actAsWithoutWindow().
     */
    protected function actAs(User $user): static
    {
        return $this->actAsConfirmed($user, 86400);
    }

    protected function insertSession(User $user): string
    {
        $id = bin2hex(random_bytes(20));
        DB::table('sessions')->insert([
            'id' => $id,
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'payload' => '',
            'last_activity' => time(),
        ]);

        return $id;
    }

    protected function validAccount(string $role, array $override = []): array
    {
        $departmentId = Department::query()->value('id');

        return array_merge([
            'email' => bin2hex(random_bytes(6)).'@test.arca.invalid',
            'first_name' => 'Nueva',
            'last_name' => 'Cuenta',
            'second_last_name' => 'Prueba',
            'department_id' => $departmentId,
            'role' => $role,
            'password' => 'Str0ng!Passphrase#9',
        ], $override);
    }
}
