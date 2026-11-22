<?php

namespace Tests\Feature\Admin;

use Tests\Concerns\ConfirmsStepUp;

class StepUpThrottleTest extends AdminFeatureTestCase
{
    use ConfirmsStepUp;

    /** RN-07 staff-step-up-confirmation: la ruta de confirmación admite 10 peticiones por minuto y usuario. */
    public function test_rn07_confirmation_has_a_per_user_rate_limit(): void
    {
        $admin = $this->createAccount('admin');
        $other = $this->createAccount('admin');

        for ($i = 0; $i < 10; $i++) {
            $this->actAsWithoutWindow($admin)->postJson('/api/v1/admin/password-confirmation', ['password' => self::STEP_UP_PASSWORD])->assertOk();
        }

        $this->actAsWithoutWindow($admin)->postJson('/api/v1/admin/password-confirmation', ['password' => self::STEP_UP_PASSWORD])
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJsonPath('message', 'Demasiadas solicitudes de confirmación. Espera un minuto e inténtalo de nuevo.');

        $this->actAsWithoutWindow($other)->postJson('/api/v1/admin/password-confirmation', ['password' => self::STEP_UP_PASSWORD])->assertOk();
    }
}
