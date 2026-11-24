<?php

namespace Tests\Feature\Admin;

class PendingReviewCountsAccessTest extends PendingReviewTestCase
{
    /**
     * CA-07 pending-review-counts. api-027 (2026-11-21): `admin` ya no recibe 403 porque ahora tiene
     * `reports.cancellations.view` y la ruta admite ese permiso; solo recibe `cancellation_days`.
     */
    public function test_ca07_403_without_either_permission_and_no_data(): void
    {
        foreach (['executive', 'cashier', 'veterinarian'] as $role) {
            $user = $this->createAccount($role);
            $response = $this->actAs($user)->getJson(self::URL)->assertForbidden();

            $this->assertArrayNotHasKey('species_requests', $response->json() ?? []);
            $this->assertArrayNotHasKey('memories', $response->json() ?? []);
        }
    }

    /** CA-07 pending-review-counts (sin sesión) */
    public function test_ca07_401_without_session(): void
    {
        $this->getJson(self::URL)->assertUnauthorized();
    }

    /** CA-07 pending-review-counts (2FA sin confirmar) */
    public function test_ca07_two_factor_not_confirmed_returns_no_counts(): void
    {
        $user = $this->createAccount('zoo-admin', false);
        $response = $this->actAs($user)->getJson(self::URL)->assertForbidden();

        $this->assertArrayNotHasKey('species_requests', $response->json());
        $this->assertArrayNotHasKey('memories', $response->json());
    }
}
