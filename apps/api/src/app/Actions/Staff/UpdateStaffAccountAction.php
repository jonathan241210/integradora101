<?php

namespace App\Actions\Staff;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateStaffAccountAction
{
    /**
     * @return array{user: User, changed_fields: array<string>}
     */
    public function execute(User $user, array $data): array
    {
        if (array_key_exists('email', $data) && is_string($data['email'])) {
            $data['email'] = mb_strtolower(trim($data['email']));
        }

        $validated = Validator::make($data, [
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->getKey())],
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'second_last_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'department_id' => ['sometimes', 'required', 'integer', Rule::exists('departments', 'id')->where('is_active', true)],
            'role' => ['sometimes', 'required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'password' => ['sometimes', 'required', 'string', Password::defaults()],
        ], [
            'required' => 'El campo :attribute es obligatorio.',
            'email.email' => 'El correo electrónico debe tener un formato válido.',
            'email.max' => 'El correo electrónico no puede exceder 255 caracteres.',
            'email.unique' => 'Este correo electrónico ya está registrado.',
            'string' => 'El campo :attribute debe ser texto.',
            'max' => 'El campo :attribute no puede exceder 255 caracteres.',
            'integer' => 'El área seleccionada no es válida.',
            'department_id.exists' => 'El área seleccionada no existe o está inactiva.',
            'role.exists' => 'El rol seleccionado no existe.',
            'password.*' => 'La contraseña no cumple con los requisitos de seguridad.',
        ], [
            'email' => 'correo electrónico',
            'first_name' => 'nombre',
            'last_name' => 'primer apellido',
            'second_last_name' => 'segundo apellido',
            'department_id' => 'área',
            'role' => 'rol',
            'password' => 'contraseña',
        ])->validate();

        return DB::transaction(function () use ($user, $validated): array {
            $originalAttributes = $user->getAttributes();
            $originalRoles = $user->getRoleNames()->values()->all();
            $fields = ['email', 'first_name', 'last_name', 'second_last_name', 'department_id', 'password'];
            $attributes = array_intersect_key($validated, array_flip($fields));

            $user->fill($attributes);
            $user->updated_by = Auth::id();
            $user->save();

            if (array_key_exists('role', $validated)) {
                $user->syncRoles([$validated['role']]);
            }

            $changedFields = [];
            foreach (array_keys($attributes) as $field) {
                if ($field === 'password') {
                    if ($user->wasChanged('password')) {
                        $changedFields[] = 'password';
                    }

                    continue;
                }

                $before = $originalAttributes[$field] ?? null;
                $after = $user->getAttributes()[$field] ?? null;
                if ((string) $before !== (string) $after) {
                    $changedFields[] = $field;
                }
            }

            if (array_key_exists('role', $validated) && $originalRoles !== [$validated['role']]) {
                $changedFields[] = 'role';
            }

            return [
                'user' => $user->fresh(['department', 'roles']),
                'changed_fields' => $changedFields,
            ];
        });
    }
}
