<?php

namespace App\Actions\Staff;

use App\Models\Department;

class SuggestRoleForDepartmentAction
{
    public function execute(Department $department): ?string
    {
        return match ($department->code) {
            'presidency', 'information-technology' => 'admin',
            'management' => 'zoo-admin',
            'box-office' => 'cashier',
            'veterinary' => 'veterinarian',
            default => null,
        };
    }
}
