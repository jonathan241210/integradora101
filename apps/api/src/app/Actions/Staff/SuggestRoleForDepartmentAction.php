<?php

namespace App\Actions\Staff;

use App\Models\Department;

class SuggestRoleForDepartmentAction
{
    public function execute(Department $department): ?string
    {
        return match ($department->code) {
            // api-023 CA-09: nunca se sugiere `admin`; las cuentas admin solo se crean desde la consola.
            'presidency', 'information-technology' => 'executive',
            'management' => 'zoo-admin',
            'box-office' => 'cashier',
            'veterinary' => 'veterinarian',
            default => null,
        };
    }
}
