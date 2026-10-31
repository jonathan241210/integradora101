<?php

namespace Tests\Feature\Auth;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class MeTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-05 staff-authentication */
    public function test_ca05_staff_authentication_me_returns_profile_and_role_home(): void
    {
        config(['arca.pwa_url' => 'https://pwa.example.test']);

        $expectedHomes = [
            'admin' => 'administration',
            'zoo-admin' => 'administration',
            'executive' => 'executive',
            'cashier' => 'ticket',
            'veterinarian' => 'pwa',
        ];

        foreach ($expectedHomes as $role => $home) {
            $user = $this->createStaffUser($role);
            Auth::forgetGuards();

            $response = $this->actingAs($user, 'web')->getJson('/api/v1/auth/me');

            $response->assertOk()
                ->assertJsonPath('data.id', $user->id)
                ->assertJsonPath('data.email', $user->email)
                ->assertJsonPath('data.department.code', 'test-department')
                ->assertJsonPath('data.roles.0', $role)
                ->assertJsonPath('data.home', $home)
                ->assertJsonPath('data.two_factor_setup_required', in_array($role, ['admin', 'zoo-admin'], true));

            if ($role === 'veterinarian') {
                $response->assertJsonPath('data.pwa_url', 'https://pwa.example.test');
            } else {
                $response->assertJsonPath('data.pwa_url', null);
            }
        }
    }

    /** CA-06 staff-authentication */
    public function test_ca06_staff_authentication_me_and_protected_routes_require_a_session(): void
    {
        Route::middleware(['auth:sanctum', 'administrator.two-factor'])
            ->get('/api/v1/__test/protected', fn () => response()->json(['ok' => true]))
            ->name('auth.test.protected');

        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->getJson('/api/v1/__test/protected')->assertUnauthorized();
    }
}
