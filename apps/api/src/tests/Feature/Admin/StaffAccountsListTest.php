<?php

namespace Tests\Feature\Admin;

class StaffAccountsListTest extends AdminFeatureTestCase
{
    /** CA-01 */
    public function test_ca01_administration_management_lists_filters_orders_and_hides_secrets(): void
    {
        $admin = $this->createAccount('admin');
        $zeta = $this->createAccount('cashier', true, ['last_name' => 'Zzzapata', 'first_name' => 'Ana']);
        $alfa = $this->createAccount('cashier', true, ['last_name' => 'Aaalfaro', 'first_name' => 'Beto', 'is_active' => false]);

        $response = $this->actAs($admin)->getJson('/api/v1/admin/users?role=cashier&per_page=100')->assertOk();
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->search($alfa->id) < $ids->search($zeta->id));
        $this->assertNotContains($admin->id, $ids->all());

        $row = $response->json('data.0');
        foreach (['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'] as $secret) {
            $this->assertArrayNotHasKey($secret, $row);
        }
        $response->assertJsonStructure(['data' => [['id', 'full_name', 'email', 'department', 'role' => ['name', 'label'], 'is_active', 'two_factor_confirmed']], 'meta', 'links']);

        $inactive = $this->actAs($admin)->getJson('/api/v1/admin/users?status=inactive&search=aaalfaro')->assertOk();
        $this->assertSame([$alfa->id], collect($inactive->json('data'))->pluck('id')->all());
    }
}
