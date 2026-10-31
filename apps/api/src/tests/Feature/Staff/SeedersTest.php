<?php

namespace Tests\Feature\Staff;

use App\Models\Department;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Spatie\Permission\Models\Role;
use Tests\FeatureTestCase;

class SeedersTest extends FeatureTestCase
{
    /** CA-15 staff-authentication */
    public function test_ca15_staff_authentication_seeders_create_the_five_departments_and_role_matrix_idempotently(): void
    {
        (new DepartmentSeeder)->run();
        (new RolesAndPermissionsSeeder)->run();
        (new DepartmentSeeder)->run();
        (new RolesAndPermissionsSeeder)->run();

        $this->assertSame(5, Department::query()->whereIn('code', [
            'presidency',
            'information-technology',
            'management',
            'box-office',
            'veterinary',
        ])->count());

        $this->assertSame(5, Role::query()->whereIn('name', [
            'admin',
            'zoo-admin',
            'executive',
            'cashier',
            'veterinarian',
        ])->where('guard_name', 'web')->count());

        $admin = Role::findByName('admin', 'web');
        $zooAdmin = Role::findByName('zoo-admin', 'web');

        $this->assertTrue($admin->hasPermissionTo('users.manage'));
        $this->assertTrue($admin->hasPermissionTo('operational-staff.manage'));
        $this->assertTrue($zooAdmin->hasPermissionTo('operational-staff.manage'));
        $this->assertFalse($zooAdmin->hasPermissionTo('users.manage'));
        $this->assertTrue($zooAdmin->hasPermissionTo('news.manage'));
    }
}
