<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use RuntimeException;

class DemoStaffSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('DemoStaffSeeder no se puede ejecutar en producción.');
        }

        if ($this->activeDatabaseName() === 'arca_zoo') {
            throw new RuntimeException('DemoStaffSeeder no se puede ejecutar en arca_zoo.');
        }

        $password = config('arca.demo_staff_password');

        if (! is_string($password) || $password === '') {
            throw new RuntimeException('Configura DEMO_STAFF_PASSWORD antes de ejecutar DemoStaffSeeder.');
        }

        $validation = Validator::make(
            ['password' => $password],
            ['password' => ['required', 'string', Password::min(12)->mixedCase()->numbers()->symbols()]],
        );

        if ($validation->fails()) {
            throw new RuntimeException('DEMO_STAFF_PASSWORD no cumple la política de contraseñas.');
        }

        foreach ($this->accounts() as $account) {
            $department = Department::query()->where('code', $account['department'])->firstOrFail();
            $user = User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'first_name' => $account['first_name'],
                    'last_name' => $account['last_name'],
                    'second_last_name' => null,
                    'department_id' => $department->id,
                    'is_active' => true,
                    'password' => $password,
                ],
            );

            $user->syncRoles($account['role']);
        }
    }

    protected function activeDatabaseName(): string
    {
        return DB::getDatabaseName();
    }

    private function accounts(): array
    {
        return [
            ['email' => 'presidencia@arca.local', 'first_name' => 'Administración', 'last_name' => 'General', 'department' => 'presidency', 'role' => 'admin'],
            ['email' => 'admin@arca.local', 'first_name' => 'Admin', 'last_name' => 'Informática', 'department' => 'information-technology', 'role' => 'admin'],
            ['email' => 'direccion_zoo@arca.local', 'first_name' => 'Dirección', 'last_name' => 'Zoológico', 'department' => 'management', 'role' => 'zoo-admin'],
            ['email' => 'ejecutivo@arca.local', 'first_name' => 'Ejecutivo', 'last_name' => 'Dirección', 'department' => 'management', 'role' => 'executive'],
            ['email' => 'boletaje@arca.local', 'first_name' => 'Personal', 'last_name' => 'Taquilla', 'department' => 'box-office', 'role' => 'cashier'],
            ['email' => 'veterinario@arca.local', 'first_name' => 'Personal', 'last_name' => 'Veterinario', 'department' => 'veterinary', 'role' => 'veterinarian'],
        ];
    }
}
