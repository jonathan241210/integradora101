<?php

namespace Tests\Feature\Admin;

class StaffAccountsUpdateTest extends AdminFeatureTestCase
{
    /** CA-06 */
    public function test_ca06_administration_management_updates_data_and_role_but_not_email(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccount('cashier');
        $email = $target->email;

        $this->actAs($admin)->patchJson("/api/v1/admin/users/{$target->id}", [
            'first_name' => 'Renombrada',
            'role' => 'veterinarian',
            'email' => 'otro@test.arca.invalid',
        ])->assertOk()->assertJsonPath('data.first_name', 'Renombrada')->assertJsonPath('data.role.name', 'veterinarian');

        $fresh = $target->fresh();
        $this->assertSame($email, $fresh->email);
        $this->assertSame($admin->id, $fresh->updated_by);
        $this->assertTrue($fresh->hasRole('veterinarian'));
        $this->assertFalse($fresh->hasRole('cashier'));
    }
}
