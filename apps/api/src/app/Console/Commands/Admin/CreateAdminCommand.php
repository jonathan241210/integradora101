<?php

namespace App\Console\Commands\Admin;

use App\Actions\Staff\CreateStaffAccountAction;
use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

use function Laravel\Prompts\password as promptPassword;
use function Laravel\Prompts\select;
use function Laravel\Prompts\text;

class CreateAdminCommand extends ConsoleAdminCommand
{
    /** Nivel de seguridad: lo lee `arca:admin:help` (api-023, revisión 2026-11-21 b). */
    public const LEVEL = 'alto';

    protected $signature = 'arca:admin:create {--r|reason= : Motivo del cambio (mínimo 10 caracteres)} {--y|yes : Confirma sin preguntar (nivel alto)} {--c|confirm-email= : Correo afectado, solo en modo recuperación}';

    protected $description = 'Crea una cuenta de administrador (nivel alto: pide la contraseña del titular)';

    public function handle(CreateStaffAccountAction $create): int
    {
        if ($this->rejectWithoutTerminal()) {
            return self::FAILURE;
        }

        $reason = $this->askReason();

        if ($reason === null) {
            return self::FAILURE;
        }

        $recovery = (bool) config('arca.admin_recovery')
            && ! User::query()->role('admin')->where('is_active', true)->exists();
        $mode = $this->authorizeHighLevel('arca:admin:create', null, $recovery);

        if ($mode === null) {
            return self::FAILURE;
        }

        $email = mb_strtolower(trim(text(
            label: 'Correo institucional',
            validate: fn (string $value) => filter_var($value, FILTER_VALIDATE_EMAIL)
                ? (User::withTrashed()->where('email', mb_strtolower(trim($value)))->exists() ? 'El correo ya está registrado.' : null)
                : 'Escribe un correo válido.',
        )));
        $firstName = trim(text('Nombre', required: true));
        $lastName = trim(text('Primer apellido', required: true));
        $secondLastName = trim(text('Segundo apellido', required: false));

        if (mb_strlen($email) > 255 || mb_strlen($firstName) > 100 || mb_strlen($lastName) > 100 || mb_strlen($secondLastName) > 100) {
            $this->error('El correo admite máximo 255 caracteres y cada nombre o apellido, máximo 100.');

            return self::FAILURE;
        }

        $departments = Department::query()->where('is_active', true)->orderBy('name')->get();

        if ($departments->isEmpty()) {
            $this->error('No hay áreas activas para asignar.');

            return self::FAILURE;
        }

        $department = $departments->firstWhere('name', select(label: 'Área', options: $departments->pluck('name')->all()));

        $password = promptPassword(
            label: 'Contraseña',
            validate: fn (string $value) => Validator::make(
                ['password' => $value],
                ['password' => ['required', Password::defaults()]],
            )->errors()->first('password') ?: null,
        );

        if (! hash_equals($password, promptPassword('Confirma la contraseña'))) {
            $this->error('Las contraseñas no coinciden.');

            return self::FAILURE;
        }

        $confirmed = $this->confirmChange([
            'Operación' => 'Crear cuenta de administrador',
            'Cuenta' => $email,
            'Nombre' => trim("$firstName $lastName $secondLastName"),
            'Área' => $department->name,
            'Rol' => 'admin',
            'Motivo' => $reason,
        ], $mode === self::MODE_RECOVERY ? $email : null);

        if (! $confirmed) {
            return $this->declined();
        }

        try {
            return $this->applyChange(
                $mode === self::MODE_RECOVERY ? 'console-recovery-created' : 'console-created',
                ($mode === self::MODE_RECOVERY ? 'Recuperación: ' : '').'Cuenta de administrador creada',
                $reason,
                fn () => $create->execute([
                    'email' => $email,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'second_last_name' => $secondLastName !== '' ? $secondLastName : null,
                    'department_id' => $department->id,
                    'role' => 'admin',
                    'password' => $password,
                ]),
                'Cuenta de administrador creada para %s. Debe configurar el segundo factor en su primer inicio de sesión.',
                $mode === self::MODE_RECOVERY ? 'recuperación' : null,
            );
        } catch (ValidationException $e) {
            $this->error($e->validator->errors()->first());

            return self::FAILURE;
        }
    }
}
