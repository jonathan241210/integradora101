<?php

namespace Tests\Feature\Admin;

use App\Models\Department;

class StaffAccountOptionsTest extends AdminFeatureTestCase
{
    /** CA-12 */
    public function test_ca12_administration_management_options_depend_on_the_actor(): void
    {
        $admin = $this->createAccount('admin');
        $zoo = $this->createAccount('zoo-admin');
        Department::firstOrCreate(['code' => 'box-office'], ['name' => 'Taquilla', 'description' => null, 'is_active' => true]);
        Department::firstOrCreate(['code' => 'presidency'], ['name' => 'Presidencia', 'description' => null, 'is_active' => true]);

        $adminData = $this->actAs($admin)->getJson('/api/v1/admin/users/options')->assertOk()->json('data');
        $this->assertCount(5, $adminData['roles']);
        $presidency = collect($adminData['departments'])->firstWhere('code', 'presidency');
        $this->assertSame('admin', $presidency['suggested_role']);

        $zooData = $this->actAs($zoo)->getJson('/api/v1/admin/users/options')->assertOk()->json('data');
        $this->assertSame(['cashier', 'veterinarian'], collect($zooData['roles'])->pluck('name')->all());
        $this->assertNull(collect($zooData['departments'])->firstWhere('code', 'presidency')['suggested_role']);
        $this->assertSame('cashier', collect($zooData['departments'])->firstWhere('code', 'box-office')['suggested_role']);
    }
}
