<?php

namespace Tests\Feature\Admin;

use App\Actions\Admin\Users\ResolveManageableRolesAction;
use App\Models\Department;

class StaffAccountOptionsTest extends AdminFeatureTestCase
{
    /** CA-12 */
    public function test_ca12_administration_management_only_admin_receives_the_five_roles(): void
    {
        $admin = $this->createAccount('admin');
        Department::firstOrCreate(['code' => 'presidency'], ['name' => 'Presidencia', 'description' => null, 'is_active' => true]);

        $data = $this->actAs($admin)->getJson('/api/v1/admin/users/options')->assertOk()->json('data');
        $this->assertCount(5, $data['roles']);
        $labels = ResolveManageableRolesAction::LABELS;
        $this->assertSame(array_keys($labels), collect($data['roles'])->pluck('name')->all());
        $this->assertSame(array_values($labels), collect($data['roles'])->pluck('label')->all());
        $presidency = collect($data['departments'])->firstWhere('code', 'presidency');
        $this->assertSame('admin', $presidency['suggested_role']);

        foreach (['zoo-admin', 'executive', 'cashier', 'veterinarian'] as $role) {
            $this->actAs($this->createAccount($role))->getJson('/api/v1/admin/users/options')->assertForbidden();
        }
    }
}
