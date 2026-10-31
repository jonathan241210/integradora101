<?php

namespace App\Console\Commands;

use App\Models\Department;
use App\Models\User;
use Illuminate\Console\Command;

class CreateStaff extends Command
{
    protected $signature = 'arca:create-staff {email} {first_name} {last_name} {--department=veterinary : Código del departamento}';

    protected $description = 'Crea una cuenta de personal (la contraseña se pide por consola).';

    public function handle(): int
    {
        $email = $this->argument('email');

        if (User::where('email', $email)->exists()) {
            $this->error('Ya existe una cuenta con ese correo.');

            return self::FAILURE;
        }

        $password = $this->secret('Contraseña (mínimo 8 caracteres)');

        if (strlen((string) $password) < 8) {
            $this->error('La contraseña debe tener al menos 8 caracteres.');

            return self::FAILURE;
        }

        $department = Department::where('code', $this->option('department'))->first();

        if (! $department) {
            $this->error('No existe el departamento con ese código.');

            return self::FAILURE;
        }

        User::create([
            'first_name' => $this->argument('first_name'),
            'last_name' => $this->argument('last_name'),
            'email' => $email,
            'password' => $password,
            'department_id' => $department->id,
            'is_active' => true,
        ]);

        $this->info("Cuenta creada para {$email}.");

        return self::SUCCESS;
    }
}
