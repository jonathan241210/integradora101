<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Support\Facades\Gate;

class StaffAccountsScopeTest extends AdminFeatureTestCase
{
    /** CA-02: solo `users.manage` (admin) llega a las rutas de cuentas; el resto recibe 403. */
    public function test_ca02_administration_management_only_admin_reaches_account_routes(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccount('cashier');

        foreach (['zoo-admin', 'executive', 'cashier', 'veterinarian'] as $role) {
            $actor = $this->createAccount($role);

            $this->actAs($actor)->getJson('/api/v1/admin/users')->assertForbidden();
            $this->actAs($actor)->getJson('/api/v1/admin/users/options')->assertForbidden();
            $this->actAs($actor)->getJson("/api/v1/admin/users/{$target->id}")->assertForbidden();
            $this->actAs($actor)->postJson('/api/v1/admin/users', $this->validAccount('cashier'))->assertForbidden();
            $this->actAs($actor)->patchJson("/api/v1/admin/users/{$target->id}", ['role' => 'veterinarian'])->assertForbidden();
            $this->actAs($actor)->patchJson("/api/v1/admin/users/{$target->id}/status", [])->assertForbidden();
            $this->actAs($actor)->deleteJson("/api/v1/admin/users/{$target->id}")->assertForbidden();
            $this->actAs($actor)->putJson("/api/v1/admin/users/{$target->id}/password", ['password' => 'weak'])->assertForbidden();
            $this->actAs($actor)->deleteJson("/api/v1/admin/users/{$target->id}/two-factor")->assertForbidden();
        }

        $this->assertTrue($target->fresh()->hasRole('cashier'));
        $this->assertNull($target->fresh()->deleted_at);

        $ids = collect($this->actAs($admin)->getJson('/api/v1/admin/users?per_page=100')->assertOk()->json('data'))->pluck('id')->all();
        $this->assertContains($target->id, $ids);
        $this->assertContains($admin->id, $ids);
        $this->actAs($admin)->getJson("/api/v1/admin/users/{$target->id}")->assertOk();
    }

    /** CA-04 */
    public function test_ca04_administration_management_zoo_admin_cannot_assign_any_role(): void
    {
        $zoo = $this->createAccount('zoo-admin');
        $cashier = $this->createAccount('cashier');

        foreach (['admin', 'veterinarian'] as $role) {
            $this->actAs($zoo)->postJson('/api/v1/admin/users', $this->validAccount($role))->assertForbidden();
        }
        $this->actAs($zoo)->patchJson("/api/v1/admin/users/{$cashier->id}", ['role' => 'executive'])->assertForbidden();
        $this->assertTrue($cashier->fresh()->hasRole('cashier'));
    }

    /** CA-04: admin asigna cualquiera de los cinco roles. */
    public function test_ca04_administration_management_admin_assigns_any_of_the_five_roles(): void
    {
        $admin = $this->createAccount('admin');

        foreach (['admin', 'zoo-admin', 'executive', 'cashier', 'veterinarian'] as $role) {
            $this->actAs($admin)->postJson('/api/v1/admin/users', $this->validAccount($role))->assertCreated();
        }
    }

    /** CA-04 */
    public function test_ca04_administration_management_unknown_role_is_a_validation_error(): void
    {
        $admin = $this->createAccount('admin');

        $this->actAs($admin)->postJson('/api/v1/admin/users', $this->validAccount('inexistente'))
            ->assertUnprocessable()->assertJsonValidationErrors('role');
    }

    /** CA-02: cuenta inexistente → 404 para admin. */
    public function test_ca02_administration_management_missing_account_is_404(): void
    {
        $admin = $this->createAccount('admin');

        $this->actAs($admin)->getJson('/api/v1/admin/users/999999999')
            ->assertNotFound()->assertJsonPath('message', 'Usuario no encontrado.');
        $this->actAs($admin)->patchJson('/api/v1/admin/users/999999999', ['role' => 'executive'])->assertNotFound();
    }

    /** CA-04: el 403 de defensa de la política sigue negando la asignación a quien no tiene `users.manage`. */
    public function test_ca04_administration_management_assign_role_policy_denies_actors_without_users_manage(): void
    {
        $zoo = $this->createAccount('zoo-admin');
        $admin = $this->createAccount('admin');

        foreach (['admin', 'zoo-admin', 'executive', 'cashier', 'veterinarian'] as $role) {
            $this->assertFalse(Gate::forUser($zoo)->allows('assignRole', [User::class, $role]));
            $this->assertTrue(Gate::forUser($admin)->allows('assignRole', [User::class, $role]));
        }
    }
}
