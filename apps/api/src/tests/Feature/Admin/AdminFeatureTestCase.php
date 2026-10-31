<?php

namespace Tests\Feature\Admin;

use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesAdministrators;
use Tests\FeatureTestCase;

abstract class AdminFeatureTestCase extends FeatureTestCase
{
    use CreatesAdministrators;

    protected function actAs(User $user): static
    {
        Auth::forgetGuards();

        return $this->actingAs($user, 'web');
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
