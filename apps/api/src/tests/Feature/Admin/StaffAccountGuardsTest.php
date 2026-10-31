<?php

namespace Tests\Feature\Admin;

use App\Models\User;

class StaffAccountGuardsTest extends AdminFeatureTestCase
{
    /** CA-09 */
    public function test_ca09_administration_management_protects_self_and_the_last_active_admin(): void
    {
        $admin = $this->createAccount('admin');
        User::role('admin')->whereKeyNot($admin->id)->update(['is_active' => false]);

        $this->actAs($admin)->patchJson("/api/v1/admin/users/{$admin->id}/status", ['is_active' => false])
            ->assertUnprocessable()->assertJsonPath('message', 'No puedes desactivar tu propia cuenta.');
        $this->actAs($admin)->deleteJson("/api/v1/admin/users/{$admin->id}")
            ->assertUnprocessable()->assertJsonPath('message', 'No puedes eliminar tu propia cuenta.');
        $this->actAs($admin)->patchJson("/api/v1/admin/users/{$admin->id}", ['role' => 'executive'])
            ->assertUnprocessable()->assertJsonPath('message', 'No puedes cambiar tu propio rol.');
        $this->actAs($admin)->putJson("/api/v1/admin/users/{$admin->id}/password", ['password' => 'N3w!Passphrase#77'])
            ->assertUnprocessable()->assertJsonPath('message', 'No puedes restablecer tu propia contraseña desde la administración.');
        $this->actAs($admin)->deleteJson("/api/v1/admin/users/{$admin->id}/two-factor")
            ->assertUnprocessable()->assertJsonPath('message', 'No puedes restablecer tu propio segundo factor desde la administración.');
        $this->assertTrue($admin->fresh()->hasRole('admin'));

        $other = $this->createAccount('admin');
        $this->actAs($admin)->patchJson("/api/v1/admin/users/{$other->id}/status", ['is_active' => false])->assertOk();
        // Con otro administrador inactivo, eliminarlo no deja al sistema sin administradores.
        $this->actAs($admin)->deleteJson("/api/v1/admin/users/{$other->id}")->assertNoContent();
    }
}
