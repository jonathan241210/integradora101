<?php

namespace Tests\Feature\Auth;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Tests\Concerns\CreatesAdministrators;
use Tests\FeatureTestCase;

class StaffTokenTwoFactorTest extends FeatureTestCase
{
    use CreatesAdministrators;

    private const PASSWORD = 'SafePassphrase12!';

    private const CODE = 'two_factor_login_required';

    /** CA-42 staff-step-up-confirmation */
    public function test_ca42_token_login_rejects_2fa_roles_without_issuing_a_token(): void
    {
        foreach (['cashier', 'admin', 'zoo-admin'] as $role) {
            $user = $this->createAccount($role, $role !== 'cashier');
            $tokens = DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->count();

            $this->postJson('/api/v1/staff/auth/login', ['email' => $user->email, 'password' => self::PASSWORD])
                ->assertForbidden()
                ->assertJsonPath('code', self::CODE)
                ->assertJsonPath('message', 'Esta cuenta debe iniciar sesión desde el panel con su segundo factor.')
                ->assertJsonMissingPath('token');

            $this->assertSame($tokens, DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->count());
            $this->assertNull($user->fresh()->last_login_at, "{$role}: no actualiza last_login_at");
        }
    }

    /** CA-42 staff-step-up-confirmation: el rechazo va después de validar la contraseña y no limpia el límite de login. */
    public function test_ca42_role_rejection_does_not_allow_enumeration_or_clear_the_limit(): void
    {
        $cashier = $this->createAccount('cashier');
        $key = 'login:'.strtolower($cashier->email).'|127.0.0.1';
        RateLimiter::clear($key);

        // Contraseña incorrecta: misma respuesta que una cuenta inexistente.
        $wrong = $this->postJson('/api/v1/staff/auth/login', ['email' => $cashier->email, 'password' => 'Incorrecta12345!'])
            ->assertStatus(422);
        $missing = $this->postJson('/api/v1/staff/auth/login', ['email' => 'nadie@test.arca.invalid', 'password' => 'Incorrecta12345!'])
            ->assertStatus(422);
        $this->assertSame($missing->json(), $wrong->json());
        $this->assertSame(1, RateLimiter::attempts($key));

        // Contraseña correcta: 403 por rol, sin limpiar el contador de intentos fallidos.
        $this->postJson('/api/v1/staff/auth/login', ['email' => $cashier->email, 'password' => self::PASSWORD])
            ->assertForbidden()->assertJsonPath('code', self::CODE);
        $this->assertSame(1, RateLimiter::attempts($key));

        RateLimiter::clear($key);
    }

    /** CA-42 staff-step-up-confirmation */
    public function test_ca42_veterinarian_still_receives_a_token(): void
    {
        $vet = $this->createAccount('veterinarian', false);

        $token = $this->postJson('/api/v1/staff/auth/login', ['email' => $vet->email, 'password' => self::PASSWORD])
            ->assertOk()
            ->assertJsonStructure(['token', 'user'])
            ->json('token');

        Auth::forgetGuards();
        $this->withToken($token)->getJson('/api/v1/veterinarian/species')->assertOk();
        $this->assertNotNull($vet->fresh()->last_login_at);
    }

    /** CA-42 staff-step-up-confirmation: los tokens emitidos antes de la regla tampoco entran a admin/*. */
    public function test_ca42_old_token_of_a_2fa_role_is_rejected_in_admin(): void
    {
        $cashier = $this->createAccount('cashier');
        $admin = $this->createAccount('admin');

        foreach ([[$cashier, '/api/v1/admin/tickets'], [$admin, '/api/v1/admin/users']] as [$user, $url]) {
            $token = $user->createToken('pwa')->plainTextToken;
            Auth::forgetGuards();

            $this->withToken($token)->getJson($url)
                ->assertForbidden()
                ->assertJsonPath('code', self::CODE);
        }

        // La sesión de navegador (sin token personal) sigue entrando.
        $this->flushHeaders();
        Auth::forgetGuards();
        $this->actingAs($cashier, 'web')->getJson('/api/v1/admin/tickets')->assertOk();
    }

    /** CA-42 staff-step-up-confirmation (api-021 RN-19): el token de un rol con 2FA tampoco entra a staff/* ni a auth/me. */
    public function test_ca42_api021_rn19_token_of_a_2fa_role_is_rejected_outside_admin(): void
    {
        $cashier = $this->createAccount('cashier');
        $admin = $this->createAccount('admin');

        foreach ([$cashier, $admin] as $user) {
            $token = $user->createToken('pwa')->plainTextToken;

            foreach (['/api/v1/staff/auth/session', '/api/v1/staff/animals', '/api/v1/staff/sync/bootstrap', '/api/v1/auth/me'] as $url) {
                Auth::forgetGuards();
                $this->withToken($token)->getJson($url)
                    ->assertForbidden()
                    ->assertJsonPath('code', self::CODE)
                    ->assertJsonPath('message', 'Esta cuenta debe iniciar sesión desde el panel con su segundo factor.');
            }
            $this->flushHeaders();
        }

        // El veterinario con token sigue funcionando en staff/* y auth/me.
        $vet = $this->createAccount('veterinarian', false);
        $token = $vet->createToken('pwa')->plainTextToken;
        foreach (['/api/v1/staff/auth/session', '/api/v1/auth/me'] as $url) {
            Auth::forgetGuards();
            $this->withToken($token)->getJson($url)->assertOk();
        }
        $this->flushHeaders();

        // La sesión de navegador (sin token personal) de un rol con 2FA sigue entrando a auth/me.
        Auth::forgetGuards();
        $this->actingAs($cashier, 'web')->getJson('/api/v1/auth/me')->assertOk();
    }
}
