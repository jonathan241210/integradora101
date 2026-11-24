<?php

namespace App\Actions\Admin\Users;

use App\Actions\Staff\SuggestRoleForDepartmentAction;
use App\Models\Department;
use App\Models\User;
use App\Support\Staff\StaffRoleCatalog;
use Spatie\Permission\Models\Role;

class ListStaffOptionsAction
{
    public function __construct(
        private ResolveAssignableRolesAction $roles,
        private SuggestRoleForDepartmentAction $suggest,
    ) {}

    public function execute(User $actor): array
    {
        $assignable = $this->roles->execute($actor);

        $departments = Department::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Department $department) use ($assignable) {
                $suggested = $this->suggest->execute($department);

                return [
                    'id' => $department->id,
                    'code' => $department->code,
                    'name' => $department->name,
                    'suggested_role' => in_array($suggested, $assignable, true) ? $suggested : null,
                ];
            })->values()->all();

        $twoFactorRoles = (array) config('arca.two_factor_roles', []);
        $permissionsByRole = Role::query()
            ->where('guard_name', 'web')
            ->whereIn('name', $assignable)
            ->with('permissions:id,name')
            ->get()
            ->mapWithKeys(fn (Role $role) => [$role->name => $role->permissions->pluck('name')->sort()->values()->all()]);

        $roles = array_map(fn (string $name) => [
            'name' => $name,
            'label' => StaffRoleCatalog::roleLabel($name),
            'two_factor_required' => in_array($name, $twoFactorRoles, true),
            'permissions' => array_map(
                fn (string $permission) => ['name' => $permission, 'label' => StaffRoleCatalog::permissionLabel($permission)],
                $permissionsByRole[$name] ?? [],
            ),
        ], $assignable);

        return ['departments' => $departments, 'roles' => $roles];
    }
}
