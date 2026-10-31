<?php

namespace App\Http\Resources\Admin;

use App\Actions\Admin\Users\ResolveManageableRolesAction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $role = $this->roles->first()?->name;

        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'second_last_name' => $this->second_last_name,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'department' => $this->department ? [
                'id' => $this->department->id,
                'code' => $this->department->code,
                'name' => $this->department->name,
            ] : null,
            'role' => $role ? [
                'name' => $role,
                'label' => ResolveManageableRolesAction::LABELS[$role] ?? $role,
            ] : null,
            'is_active' => (bool) $this->is_active,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'two_factor_confirmed' => $this->two_factor_confirmed_at !== null,
        ];
    }
}
