<?php

namespace App\Actions\Admin\Users;

use App\Actions\Staff\SuggestRoleForDepartmentAction;
use App\Models\Department;
use App\Models\User;

class ListStaffOptionsAction
{
    public function __construct(
        private ResolveManageableRolesAction $roles,
        private SuggestRoleForDepartmentAction $suggest,
    ) {}

    public function execute(User $actor): array
    {
        $manageable = $this->roles->execute($actor);

        $departments = Department::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Department $department) use ($manageable) {
                $suggested = $this->suggest->execute($department);

                return [
                    'id' => $department->id,
                    'code' => $department->code,
                    'name' => $department->name,
                    'suggested_role' => in_array($suggested, $manageable, true) ? $suggested : null,
                ];
            })->values()->all();

        $roles = array_map(
            fn (string $name) => ['name' => $name, 'label' => ResolveManageableRolesAction::LABELS[$name]],
            $manageable,
        );

        return ['departments' => $departments, 'roles' => $roles];
    }
}
