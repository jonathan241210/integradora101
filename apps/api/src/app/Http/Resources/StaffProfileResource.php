<?php

namespace App\Http\Resources;

use App\Actions\Auth\ResolveStaffHomeAction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $home = app(ResolveStaffHomeAction::class)->execute($this->resource);
        $twoFactorRoles = config('arca.two_factor_roles', []);

        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'second_last_name' => $this->second_last_name,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'department' => $this->department ? [
                'code' => $this->department->code,
                'name' => $this->department->name,
            ] : null,
            'roles' => $this->getRoleNames()->values(),
            'permissions' => $this->getAllPermissions()->pluck('name')->unique()->values(),
            'home' => $home,
            'pwa_url' => $home === 'pwa' ? config('arca.pwa_url') : null,
            'two_factor_setup_required' => $this->hasAnyRole($twoFactorRoles) && $this->two_factor_confirmed_at === null,
        ];
    }
}
