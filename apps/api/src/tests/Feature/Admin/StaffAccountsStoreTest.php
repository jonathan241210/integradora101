<?php

namespace Tests\Feature\Admin;

use App\Models\User;

class StaffAccountsStoreTest extends AdminFeatureTestCase
{
    /** CA-03 */
    public function test_ca03_administration_management_creates_an_account_with_role_and_creator(): void
    {
        $admin = $this->createAccount('admin');
        $payload = $this->validAccount('cashier');

        $response = $this->actAs($admin)->postJson('/api/v1/admin/users', $payload)
            ->assertCreated()
            ->assertJsonPath('data.email', $payload['email'])
            ->assertJsonPath('data.role.name', 'cashier')
            ->assertJsonPath('data.is_active', true);
        $this->assertStringNotContainsString($payload['password'], $response->getContent());

        $user = User::where('email', $payload['email'])->firstOrFail();
        $this->assertSame($admin->id, $user->created_by);
        $this->assertTrue($user->hasRole('cashier'));
    }

    /** CA-05 */
    public function test_ca05_administration_management_rejects_duplicate_email_and_weak_password(): void
    {
        $admin = $this->createAccount('admin');
        $deleted = $this->createAccount('cashier');
        $deleted->delete();

        $this->actAs($admin)->postJson('/api/v1/admin/users', $this->validAccount('cashier', ['email' => $deleted->email]))
            ->assertUnprocessable()->assertJsonValidationErrors('email')
            ->assertJsonPath('errors.email.0', 'El valor de correo electrónico ya está en uso.');

        $this->actAs($admin)->postJson('/api/v1/admin/users', $this->validAccount('cashier', ['password' => 'corta']))
            ->assertUnprocessable()->assertJsonValidationErrors('password')
            ->assertJsonPath('errors.password.0', 'El campo contraseña debe tener al menos 12 caracteres.');
    }
}
