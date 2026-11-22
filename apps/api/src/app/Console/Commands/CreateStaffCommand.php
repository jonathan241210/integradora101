<?php

namespace App\Console\Commands;

use App\Actions\Console\AdminAccounts\ApplyConsoleAdminChangeAction;
use App\Actions\Staff\CreateStaffAccountAction;
use App\Actions\Staff\SuggestRoleForDepartmentAction;
use App\Console\Commands\Concerns\ConfirmsConsoleChange;
use App\Models\Department;
use App\Models\User;
use App\Support\Staff\StaffRoleCatalog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

use function Laravel\Prompts\password as promptPassword;
use function Laravel\Prompts\select;
use function Laravel\Prompts\text;

class CreateStaffCommand extends Command
{
    use ConfirmsConsoleChange;

    // api-023 RN-19: motivo, confirmación, auditoría y avisos como en `arca:admin:*`. Nunca crea cuentas admin.
    // Es interactivo: pide la contraseña en la terminal, así que no admite `--no-interaction`.
    protected $signature = 'arca:create-staff {--reason= : Motivo del cambio (mínimo 10 caracteres)} {--yes : Confirma sin preguntar}';

    protected $description = 'Crear una cuenta real de personal (no administrador)';

    public function handle(
        ApplyConsoleAdminChangeAction $apply,
        CreateStaffAccountAction $createStaffAccount,
        SuggestRoleForDepartmentAction $suggestRole,
    ): int {
        if ($this->rejectWithoutTerminal()) {
            return self::FAILURE;
        }

        $reason = $this->askReason();

        if ($reason === null) {
            return self::FAILURE;
        }

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

        // CA-24, Q4: sin `admin` y sin valor por defecto; la sugerencia del área solo aparece en la etiqueta.
        $roleOptions = [];
        foreach (StaffRoleCatalog::assignableRoles() as $code) {
            $roleOptions[$code] = $code.' — '.StaffRoleCatalog::roleLabel($code).($code === $suggestedRole ? ' (sugerido por área)' : '');
        }

        $role = select(
            label: 'Rol (elige uno)',
            options: $roleOptions,
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

        $confirmed = $this->confirmChange([
            'Operación' => 'Crear cuenta de personal',
            'Cuenta' => mb_strtolower($email),
            'Nombre' => trim("$firstName $lastName $secondLastName"),
            'Área' => $department->name,
            'Rol' => $role,
            'Motivo' => $reason,
        ]);

        if (! $confirmed) {
            return self::SUCCESS;
        }

        try {
            $user = $apply->execute('console-created', 'Cuenta de personal creada', $reason, fn () => $createStaffAccount->execute([
                'email' => $email,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'second_last_name' => $secondLastName !== '' ? $secondLastName : null,
                'department_id' => $department->id,
                'role' => $role,
                'password' => $staffPassword,
            ]));
        } catch (ValidationException $e) {
            $this->error($e->validator->errors()->first());

            return self::FAILURE;
        }

        $this->info("Cuenta creada para {$user->email}.");

        return self::SUCCESS;
    }
}
