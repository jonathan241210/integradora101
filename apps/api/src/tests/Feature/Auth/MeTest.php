<?php

namespace Tests\Feature\Auth;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class MeTest extends FeatureTestCase
{
    use CreatesAdministrators, CreatesStaffUsers;

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
            // Roles sembrados de verdad: el inicio depende de los permisos (api-023 RN-03).
            $user = $this->createAccount($role, twoFactor: false);
            Auth::forgetGuards();

            $response = $this->actingAs($user, 'web')->getJson('/api/v1/auth/me');

            $response->assertOk()
                ->assertJsonPath('data.id', $user->id)
                ->assertJsonPath('data.email', $user->email)
                ->assertJsonPath('data.department.code', 'test-department')
                ->assertJsonPath('data.roles.0', $role)
                ->assertJsonPath('data.home', $home)
                ->assertJsonPath('data.two_factor_setup_required', in_array($role, config('arca.two_factor_roles'), true));

            if ($role === 'veterinarian') {
                $response->assertJsonPath('data.pwa_url', 'https://pwa.example.test');
            } else {
                $response->assertJsonPath('data.pwa_url', null);
            }
        }
    }

    /** CA-06 api-023: el inicio sale de los permisos, no del nombre del rol (RN-03). */
    public function test_ca06_home_matrix_by_permission(): void
    {
        config(['arca.pwa_url' => 'https://pwa.example.test']);

        $matrix = [
            'admin' => 'administration',
            'zoo-admin' => 'administration',
            'executive' => 'executive',
            'cashier' => 'ticket',
            'veterinarian' => 'pwa',
        ];

        foreach ($matrix as $role => $home) {
            $user = $this->createAccount($role);
            Auth::forgetGuards();

            $this->actingAs($user, 'web')->getJson('/api/v1/auth/me')
                ->assertOk()
                ->assertJsonPath('data.home', $home)
                ->assertJsonPath('data.pwa_url', $home === 'pwa' ? 'https://pwa.example.test' : null);
        }
    }

    /** CA-07 api-023: Comunicación inicia en administración, sección Noticias; ninguna cuenta activa queda sin `home`. */
    public function test_ca07_communications_home_is_administration_with_news_section(): void
    {
        $user = $this->createAccount('communications');

        $response = $this->actingAs($user, 'web')->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.home', 'administration')
            ->assertJsonPath('data.two_factor_setup_required', false);

        $permissions = $response->json('data.permissions');
        $this->assertContains('news.manage', $permissions);
        $this->assertNotContains('dashboard.view', $permissions);
        $this->assertNotContains('users.manage', $permissions);
        $this->assertNotContains('enclosures.manage', $permissions);
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
