<?php

namespace App\Console\Commands;

use App\Actions\Staff\CreateStaffAccountAction;
use App\Actions\Staff\SuggestRoleForDepartmentAction;
use App\Models\Department;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

use function Laravel\Prompts\password as promptPassword;
use function Laravel\Prompts\select;
use function Laravel\Prompts\text;

class CreateStaffCommand extends Command
{
    protected $signature = 'arca:create-staff';

    protected $description = 'Crear una cuenta real de personal';

    public function handle(
        CreateStaffAccountAction $createStaffAccount,
        SuggestRoleForDepartmentAction $suggestRole,
    ): int {
        $email = text(
            label: 'Correo institucional',
            validate: fn (string $value) => filter_var($value, FILTER_VALIDATE_EMAIL)
                ? (User::where('email', mb_strtolower($value))->exists() ? 'El correo ya está registrado.' : null)
                : 'Escribe un correo válido.',
        );
        $firstName = text('Nombre', required: true);
        $lastName = text('Primer apellido', required: true);
        $secondLastName = text('Segundo apellido', required: false);

        $departments = Department::query()->where('is_active', true)->orderBy('name')->get();

        if ($departments->isEmpty()) {
            $this->error('No hay áreas activas para asignar.');

            return self::FAILURE;
        }

        $departmentName = select(
            label: 'Área',
            options: $departments->pluck('name')->all(),
        );
        $department = $departments->firstWhere('name', $departmentName);
        $suggestedRole = $department ? $suggestRole->execute($department) : null;
        $roles = Role::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->pluck('name')
            ->all();

        $role = select(
            label: 'Rol (sugerido por área, editable)',
            options: $roles,
            default: $suggestedRole ?? 'executive',
        );

        $staffPassword = promptPassword(
            label: 'Contraseña',
            validate: fn (string $value) => Validator::make(
                ['password' => $value],
                ['password' => ['required', Password::defaults()]],
            )->errors()->first('password') ?: null,
        );
        $passwordConfirmation = promptPassword('Confirma la contraseña');

        if (! hash_equals($staffPassword, $passwordConfirmation)) {
            $this->error('Las contraseñas no coinciden.');

            return self::FAILURE;
        }

        $user = $createStaffAccount->execute([
            'email' => $email,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'second_last_name' => $secondLastName,
            'department_id' => $department->id,
            'role' => $role,
            'password' => $staffPassword,
        ]);

        $this->info("Cuenta creada para {$user->email}.");

        return self::SUCCESS;
    }
}
