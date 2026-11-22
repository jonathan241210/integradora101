<?php

namespace App\Http\Requests\Admin;

use App\Actions\Admin\Users\GuardAssignableRoleAction;
use App\Actions\Admin\Users\ResolveAssignableRolesAction;
use Illuminate\Validation\Rule;

class UpdateStaffAccountRequest extends ManagedStaffAccountRequest
{
    protected function authorizeTarget(): bool
    {
        // El rol admin responde 403 y se audita (CA-12). Un rol desconocido lo rechaza la validación (422).
        app(GuardAssignableRoleAction::class)
            ->execute($this->input('role'), $this->target(), null, $this->route()?->getName());

        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'second_last_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'department_id' => ['sometimes', 'required', 'integer', Rule::exists('departments', 'id')->where('is_active', true)],
            'role' => ['sometimes', 'required', 'string', Rule::in(app(ResolveAssignableRolesAction::class)->execute($this->user()))],
        ];
    }
}
