<?php

namespace Tests\Feature\Admin;

class StaffAccountsScopeTest extends AdminFeatureTestCase
{
    /** CA-02 */
    public function test_ca02_administration_management_zoo_admin_only_sees_operational_accounts(): void
    {
        $zoo = $this->createAccount('zoo-admin');
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');

        $ids = collect($this->actAs($zoo)->getJson('/api/v1/admin/users?per_page=100')->assertOk()->json('data'))->pluck('id');
        $this->assertContains($cashier->id, $ids->all());
        $this->assertNotContains($admin->id, $ids->all());
        $this->assertNotContains($zoo->id, $ids->all());

        $this->actAs($zoo)->getJson("/api/v1/admin/users/{$admin->id}")
            ->assertNotFound()->assertJsonPath('message', 'Usuario no encontrado.');
        $this->actAs($zoo)->getJson("/api/v1/admin/users/{$cashier->id}")->assertOk();
        $this->actAs($zoo)->deleteJson("/api/v1/admin/users/{$admin->id}")->assertNotFound();

        $adminIds = collect($this->actAs($admin)->getJson('/api/v1/admin/users?per_page=100')->json('data'))->pluck('id');
        $this->assertContains($zoo->id, $adminIds->all());
        $this->assertContains($cashier->id, $adminIds->all());
    }

    /** CA-04 */
    public function test_ca04_administration_management_zoo_admin_cannot_assign_non_manageable_roles(): void
    {
        $zoo = $this->createAccount('zoo-admin');
        $cashier = $this->createAccount('cashier');

        $this->actAs($zoo)->postJson('/api/v1/admin/users', $this->validAccount('admin'))
            ->assertForbidden()->assertJsonPath('message', 'No tienes permiso para asignar ese rol.');

        $this->actAs($zoo)->patchJson("/api/v1/admin/users/{$cashier->id}", ['role' => 'executive'])->assertForbidden();
        $this->assertTrue($cashier->fresh()->hasRole('cashier'));

        $this->actAs($zoo)->postJson('/api/v1/admin/users', $this->validAccount('veterinarian'))->assertCreated();
    }

    /** CA-02 */
    public function test_ca02_administration_management_scope_ignores_out_of_scope_filters_and_mixed_roles(): void
    {
        $zoo = $this->createAccount('zoo-admin');
        $mixed = $this->createAccount('cashier');
        $mixed->assignRole('admin');

        $this->assertSame([], $this->actAs($zoo)->getJson('/api/v1/admin/users?role=admin')->assertOk()->json('data'));
        $ids = collect($this->actAs($zoo)->getJson('/api/v1/admin/users?per_page=100')->json('data'))->pluck('id');
        $this->assertNotContains($mixed->id, $ids->all());
        $this->actAs($zoo)->deleteJson("/api/v1/admin/users/{$mixed->id}/two-factor")->assertNotFound();
    }

    /** CA-04 */
    public function test_ca04_administration_management_unknown_role_is_a_validation_error(): void
    {
        $zoo = $this->createAccount('zoo-admin');

        $this->actAs($zoo)->postJson('/api/v1/admin/users', $this->validAccount('inexistente'))
            ->assertUnprocessable()->assertJsonValidationErrors('role');
    }

    /** CA-02 */
    public function test_ca02_administration_management_out_of_scope_account_is_404_before_validation(): void
    {
        $zoo = $this->createAccount('zoo-admin');
        $admin = $this->createAccount('admin');

        $this->actAs($zoo)->patchJson("/api/v1/admin/users/{$admin->id}", ['role' => 'executive'])->assertNotFound();
        $this->actAs($zoo)->putJson("/api/v1/admin/users/{$admin->id}/password", ['password' => 'weak'])->assertNotFound();
        $this->actAs($zoo)->patchJson("/api/v1/admin/users/{$admin->id}/status", [])->assertNotFound();
    }
}
