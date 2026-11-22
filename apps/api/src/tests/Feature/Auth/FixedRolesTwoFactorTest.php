<?php

namespace Tests\Feature\Auth;

use Illuminate\Support\Facades\Auth;
use Tests\Concerns\CreatesAdministrators;
use Tests\FeatureTestCase;

class FixedRolesTwoFactorTest extends FeatureTestCase
{
    use CreatesAdministrators;

    /** CA-04 api-023 */
    public function test_ca04_two_factor_roles_config_and_403_without_setup(): void
    {
        $roles = config('arca.two_factor_roles');
        foreach (['admin', 'zoo-admin', 'cashier', 'executive', 'communications'] as $role) {
            $this->assertContains($role, $roles);
        }
        $this->assertNotContains('veterinarian', $roles);

        foreach (['executive', 'communications'] as $role) {
            $user = $this->createAccount($role, twoFactor: false);
            Auth::forgetGuards();

            $this->actingAs($user, 'web')->getJson('/api/v1/admin/search?q=ab')
                ->assertForbidden()
                ->assertJsonPath('code', 'two_factor_setup_required');
            Auth::forgetGuards();
            $this->actingAs($user, 'web')->getJson('/api/v1/auth/me')->assertOk();
        }
    }

    /** CA-05 api-023 */
    public function test_ca05_executive_without_two_factor_gets_setup_required_in_me(): void
    {
        $user = $this->createAccount('executive', twoFactor: false);

        $this->actingAs($user, 'web')->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.home', 'executive')
            ->assertJsonPath('data.two_factor_setup_required', true);
    }
}
