<?php

namespace Tests\Feature\Admin;

use App\Models\User;

class StaffAccountGuardsTest extends AdminFeatureTestCase
{
    /**
     * CA-09 api-007 revisado por api-023: las cuentas admin (incluida la propia) no son operables desde la API, así que
     * el 403 de cuenta admin precede a las autorrestricciones y a la regla del último administrador. Esas reglas
     * siguen en las Actions y la última la aplica `arca:admin:deactivate` (CA-20 api-023).
     */
    public function test_ca09_administration_management_protects_self_and_the_last_active_admin(): void
    {
        $admin = $this->createAccount('admin');
        User::role('admin')->whereKeyNot($admin->id)->update(['is_active' => false]);
        $message = 'Las cuentas de administrador solo se gestionan desde la consola del servidor.';

        $this->actAs($admin)->patchJson("/api/v1/admin/users/{$admin->id}/status", ['is_active' => false])
            ->assertForbidden()->assertJsonPath('message', $message);
        $this->actAs($admin)->deleteJson("/api/v1/admin/users/{$admin->id}")
            ->assertForbidden()->assertJsonPath('message', $message);
        $this->actAs($admin)->patchJson("/api/v1/admin/users/{$admin->id}", ['role' => 'executive', 'password' => self::STEP_UP_PASSWORD])
            ->assertForbidden()->assertJsonPath('message', $message);
        $this->actAs($admin)->putJson("/api/v1/admin/users/{$admin->id}/password", ['current_password' => self::STEP_UP_PASSWORD, 'password' => 'N3w!Passphrase#77'])
            ->assertForbidden()->assertJsonPath('message', $message);
        $this->actAs($admin)->deleteJson("/api/v1/admin/users/{$admin->id}/two-factor", ['password' => self::STEP_UP_PASSWORD])
            ->assertForbidden()->assertJsonPath('message', $message);
        $fresh = $admin->fresh();
        $this->assertTrue($fresh->hasRole('admin'));
        $this->assertTrue((bool) $fresh->is_active);

        $other = $this->createAccount('admin');
        $this->actAs($admin)->patchJson("/api/v1/admin/users/{$other->id}/status", ['is_active' => false])->assertForbidden();
        $this->actAs($admin)->deleteJson("/api/v1/admin/users/{$other->id}")->assertForbidden();
        $this->assertTrue((bool) $other->fresh()->is_active);
        $this->assertNull($other->fresh()->deleted_at);
    }
}
