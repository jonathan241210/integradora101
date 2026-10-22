<?php

namespace Tests\Feature\Visitor;

use Illuminate\Support\Facades\Auth;
use Tests\Concerns\CreatesStaffUsers;

class IsolationTest extends VisitorFeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-08 */
    public function test_ca08_staff_and_visitor_tokens_are_isolated(): void
    {
        $staff = $this->createStaffUser('executive');
        $this->actingAs($staff, 'web')
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $staff->email);

        Auth::forgetGuards();
        unset($this->defaultHeaders['Authorization']);

        $visitor = $this->verifiedVisitor();
        $this->withVisitorToken($visitor['access_token'])
            ->getJson('/api/v1/auth/me')
            ->assertForbidden();
        $this->withVisitorToken($visitor['access_token'])
            ->getJson('/api/v1/visitor/me')
            ->assertOk()
            ->assertJsonPath('data.email', $visitor['email']);

        Auth::forgetGuards();
        unset($this->defaultHeaders['Authorization']);

        $this->actingAs($staff, 'web')
            ->getJson('/api/v1/visitor/me')
            ->assertForbidden();
    }
}
