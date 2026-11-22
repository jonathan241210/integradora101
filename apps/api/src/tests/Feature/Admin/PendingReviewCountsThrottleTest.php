<?php

namespace Tests\Feature\Admin;

class PendingReviewCountsThrottleTest extends PendingReviewTestCase
{
    /** CA-10 pending-review-counts */
    public function test_ca10_throttle_per_user_returns_429(): void
    {
        $user = $this->reviewer();
        $other = $this->reviewer();
        $noPermission = $this->createAccount('cashier');

        foreach (range(1, 60) as $i) {
            $this->actAs($user)->getJson(self::URL)->assertOk();
        }

        $this->actAs($user)->getJson(self::URL)
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertExactJson(['message' => 'Demasiadas consultas. Espera un minuto e inténtalo de nuevo.']);

        // El límite es por usuario.
        $this->actAs($other)->getJson(self::URL)->assertOk();

        // Quien no tiene permiso no consume cuota: siempre 403, nunca 429.
        foreach (range(1, 65) as $i) {
            $this->actAs($noPermission)->getJson(self::URL)->assertForbidden();
        }
    }

    /** CA-10 pending-review-counts: el administrador (solo `reports.cancellations.view` en esta ruta) también tiene tope. */
    public function test_ca10_throttle_also_applies_to_the_cancellations_permission(): void
    {
        $admin = $this->createAccount('admin');
        $this->assertTrue($admin->can('reports.cancellations.view'));

        foreach (range(1, 60) as $i) {
            $this->actAs($admin)->getJson(self::URL)->assertOk();
        }

        $this->actAs($admin)->getJson(self::URL)
            ->assertStatus(429)
            ->assertExactJson(['message' => 'Demasiadas consultas. Espera un minuto e inténtalo de nuevo.']);
    }
}
