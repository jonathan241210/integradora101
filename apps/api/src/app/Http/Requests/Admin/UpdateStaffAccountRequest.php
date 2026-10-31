<?php

namespace App\Http\Requests\Admin;

use App\Actions\Admin\Users\ResolveManageableRolesAction;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateStaffAccountRequest extends ManagedStaffAccountRequest
{
    protected function authorizeTarget(): bool
    {
        $role = $this->input('role');

        // Un rol desconocido lo rechaza la validación (422), no la autorización.
        return ! is_string($role)
            || ! array_key_exists($role, ResolveManageableRolesAction::LABELS)
            || Gate::forUser($this->user())->allows('assignRole', [User::class, $role]);
    }

    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'second_last_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'department_id' => ['sometimes', 'required', 'integer', Rule::exists('departments', 'id')->where('is_active', true)],
            'role' => ['sometimes', 'required', 'string', Rule::in(array_keys(ResolveManageableRolesAction::LABELS))],
        ];
    }
}
