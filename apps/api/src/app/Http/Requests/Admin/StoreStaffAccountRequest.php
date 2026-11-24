<?php

namespace App\Http\Requests\Admin;

use App\Actions\Admin\Users\GuardAssignableRoleAction;
use App\Actions\Admin\Users\ResolveAssignableRolesAction;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreStaffAccountRequest extends AdminFormRequest
{
    public function authorize(): bool
    {
        // El rol admin responde 403 y se audita (CA-12). Un rol desconocido lo rechaza la validación (422).
        app(GuardAssignableRoleAction::class)
            ->execute($this->input('role'), null, $this->input('email'), $this->route()?->getName());

        return true;
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
            'role' => ['required', 'string', Rule::in(app(ResolveAssignableRolesAction::class)->execute($this->user()))],
            'password' => ['required', 'string', Password::defaults()],
        ];
    }
}
