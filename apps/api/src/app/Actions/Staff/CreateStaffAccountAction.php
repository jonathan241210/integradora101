<?php

namespace App\Actions\Staff;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class CreateStaffAccountAction
{
    public function execute(array $data): User
    {
        $validated = Validator::make($data, [
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'second_last_name' => ['nullable', 'string', 'max:255'],
            'department_id' => ['required', 'integer', Rule::exists('departments', 'id')->where('is_active', true)],
            'role' => ['required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'password' => ['required', 'string', Password::defaults()],
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
            'first_name' => 'nombre',
            'last_name' => 'primer apellido',
            'second_last_name' => 'segundo apellido',
            'department_id' => 'área',
            'role' => 'rol',
            'password' => 'contraseña',
        ])->validate();

        return DB::transaction(function () use ($validated) {
            $user = User::create([
                'email' => mb_strtolower($validated['email']),
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'second_last_name' => $validated['second_last_name'] ?? null,
                'department_id' => $validated['department_id'],
                'is_active' => true,
                'created_by' => Auth::id(),
                'updated_by' => Auth::id(),
                'password' => $validated['password'],
            ]);

            $user->assignRole($validated['role']);

            return $user;
        });
    }
}
