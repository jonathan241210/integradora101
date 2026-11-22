<?php

namespace Tests\Feature\Admin;

use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\ConfirmsStepUp;

class StepUpStatusAndRoleTest extends AdminFeatureTestCase
{
    use ConfirmsStepUp;

    /** CA-35 staff-step-up-confirmation */
    public function test_ca35_activating_a_non_admin_account_requires_a_window(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccount('cashier', true, ['is_active' => false]);
        $url = "/api/v1/admin/users/{$target->id}/status";

        $this->actAsWithoutWindow($admin)->patchJson($url, ['is_active' => true])
            ->assertForbidden()
            ->assertJsonPath('code', 'password_confirmation_required')
            ->assertJsonPath('mode', 'window');
        $this->assertFalse((bool) $target->fresh()->is_active);

        $this->actAsConfirmed($admin)->patchJson($url, ['is_active' => true])
            ->assertOk()->assertJsonPath('data.is_active', true);
        $this->assertTrue((bool) $target->fresh()->is_active);
    }

    /** CA-36 staff-step-up-confirmation */
    public function test_ca36_role_change_with_other_fields_always_requires_password(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccount('cashier');
        $url = "/api/v1/admin/users/{$target->id}";
        $body = ['first_name' => 'Renombrada', 'role' => 'veterinarian'];

        // Sin password, aunque haya ventana vigente.
        $this->actAsConfirmed($admin)->patchJson($url, $body)
            ->assertForbidden()
            ->assertJsonPath('code', 'password_confirmation_required')
            ->assertJsonPath('mode', 'always');
        $this->actAsConfirmed($admin)->patchJson($url, ['role' => 'veterinarian'])
            ->assertForbidden()->assertJsonPath('mode', 'always');
        $this->assertSame('cashier', $target->fresh()->roles->first()->name);
        $this->assertNotSame('Renombrada', $target->fresh()->first_name);

        // Contraseña incorrecta.
        $this->actAsWithoutWindow($admin)->patchJson($url, $body + ['password' => 'Incorrecta12345!'])
            ->assertStatus(422)->assertJsonPath('message', 'La contraseña no es correcta.');
        $this->assertSame('cashier', $target->fresh()->roles->first()->name);

        // Contraseña correcta: se aplica la petición completa.
        $this->actAsWithoutWindow($admin)->patchJson($url, $body + ['password' => self::STEP_UP_PASSWORD])
            ->assertOk()
            ->assertJsonPath('data.first_name', 'Renombrada')
            ->assertJsonPath('data.role.name', 'veterinarian');
        $this->assertSame('veterinarian', $target->fresh()->roles->first()->name);
    }

    /** CA-36 staff-step-up-confirmation: el rol se compara por nombre exacto; `|` no es una lista de roles. */
    public function test_ca36_role_with_pipe_is_not_treated_as_the_current_role(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccount('cashier');

        $this->actAsConfirmed($admin)->patchJson("/api/v1/admin/users/{$target->id}", ['role' => 'cashier|veterinarian'])
            ->assertForbidden()->assertJsonPath('mode', 'always');
        $this->assertSame('cashier', $target->fresh()->roles->first()->name);
    }

    /** CA-36 staff-step-up-confirmation: una cuenta inexistente responde 404 sin pedir contraseña, gastar intentos ni auditar. */
    public function test_ca36_missing_account_returns_404_without_spending_attempts_or_auditing(): void
    {
        $admin = $this->createAccount('admin');

        $this->actAsWithoutWindow($admin)->patchJson('/api/v1/admin/users/999999999', ['role' => 'executive', 'password' => 'Incorrecta12345!'])
            ->assertNotFound();
        $this->actAsWithoutWindow($admin)->patchJson('/api/v1/admin/users/abc', ['role' => 'executive'])
            ->assertNotFound();

        $this->assertSame(0, Activity::query()->where('causer_id', $admin->id)->where('event', 'like', 'password-confirmation.%')->count());
        $this->actAsWithoutWindow($admin)->postJson('/api/v1/admin/password-confirmation', ['password' => self::STEP_UP_PASSWORD])->assertOk();
    }
}
