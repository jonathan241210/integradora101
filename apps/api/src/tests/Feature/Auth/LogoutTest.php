<?php

namespace Tests\Feature\Auth;

use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class LogoutTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-07 staff-authentication */
    public function test_ca07_staff_authentication_logout_invalidates_the_session(): void
    {
        $user = $this->createStaffUser('executive');
        $this->actingAs($user, 'web');

        $this->postJson('/api/v1/auth/logout')->assertNoContent();
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }
}
