<?php

namespace Tests\Feature\Admin;

use App\Models\Department;

class StaffAccountOptionsTest extends AdminFeatureTestCase
{
    /** CA-10 api-023 (api-007 CA-12): roles asignables sin `admin`, etiquetados, con permisos y 2FA. */
    public function test_ca10_options_exclude_admin_and_describe_roles(): void
    {
        $admin = $this->createAccount('admin');
        Department::firstOrCreate(['code' => 'presidency'], ['name' => 'Presidencia', 'description' => null, 'is_active' => true]);

        $data = $this->actAs($admin)->getJson('/api/v1/admin/users/options')->assertOk()->json('data');
        $roles = collect($data['roles'])->keyBy('name');

        $this->assertSame(['zoo-admin', 'executive', 'communications', 'cashier', 'veterinarian'], $roles->keys()->all());
        $this->assertSame('Consulta directiva', $roles['executive']['label']);
        $this->assertSame('Comunicación', $roles['communications']['label']);
        $this->assertTrue($roles['executive']['two_factor_required']);
        $this->assertTrue($roles['communications']['two_factor_required']);
        $this->assertFalse($roles['veterinarian']['two_factor_required']);

        $this->assertSame(
            ['dashboard.view', 'public-content.view', 'reports.view'],
            collect($roles['executive']['permissions'])->pluck('name')->sort()->values()->all(),
        );
        $this->assertSame(
            ['events.manage', 'memories.review', 'news.manage', 'public-content.view', 'species.review'],
            collect($roles['communications']['permissions'])->pluck('name')->sort()->values()->all(),
        );
        foreach ($data['roles'] as $role) {
            foreach ($role['permissions'] as $permission) {
                $this->assertNotSame($permission['name'], $permission['label'], 'Etiqueta en español para '.$permission['name']);
            }
        }

        $presidency = collect($data['departments'])->firstWhere('code', 'presidency');
        $this->assertSame('executive', $presidency['suggested_role']);

        foreach (['zoo-admin', 'executive', 'communications', 'cashier', 'veterinarian'] as $role) {
            $this->actAs($this->createAccount($role))->getJson('/api/v1/admin/users/options')->assertForbidden();
        }
    }

    /** CA-12 */
    public function test_ca12_administration_management_only_admin_receives_the_five_roles(): void
    {
        $this->assertCount(5, $this->actAs($this->createAccount('admin'))->getJson('/api/v1/admin/users/options')->assertOk()->json('data.roles'));

        foreach (['cashier', 'communications'] as $role) {
            $this->actAs($this->createAccount($role))->getJson('/api/v1/admin/users/options')->assertForbidden();
        }
    }
}
