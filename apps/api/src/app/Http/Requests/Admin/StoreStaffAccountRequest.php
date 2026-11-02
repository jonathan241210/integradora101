<?php

namespace App\Http\Requests\Admin;

use App\Actions\Admin\Users\ResolveManageableRolesAction;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreStaffAccountRequest extends AdminFormRequest
{
    public function authorize(): bool
    {
        $role = $this->input('role');

        // Un rol desconocido lo rechaza la validación (422), no la autorización.
        return ! is_string($role)
            || ! array_key_exists($role, ResolveManageableRolesAction::LABELS)
            || Gate::forUser($this->user())->allows('assignRole', [User::class, $role]);
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => Str::lower(trim($this->input('email')))]);
        }
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'second_last_name' => ['nullable', 'string', 'max:255'],
            'department_id' => ['required', 'integer', Rule::exists('departments', 'id')->where('is_active', true)],
            'role' => ['required', 'string', Rule::in(array_keys(ResolveManageableRolesAction::LABELS))],
            'password' => ['required', 'string', Password::defaults()],
        ];
    }
}
