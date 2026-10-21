<?php

namespace Tests\Feature\Visitor;

class LogoutTest extends VisitorFeatureTestCase
{
    /** CA-09 */
    public function test_ca09_logout_revokes_device_family(): void
    {
        $visitor = $this->verifiedVisitor();

        $this->withVisitorToken($visitor['access_token'])
            ->postJson('/api/v1/visitor/auth/logout', [
                'refresh_token' => $visitor['refresh_token'],
            ])->assertNoContent();

        $this->withVisitorToken($visitor['access_token'])
            ->getJson('/api/v1/visitor/me')
            ->assertUnauthorized();

        $this->postJson('/api/v1/visitor/auth/refresh', [
            'refresh_token' => $visitor['refresh_token'],
        ])->assertUnauthorized();
    }
}
