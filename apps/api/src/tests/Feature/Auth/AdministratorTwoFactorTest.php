<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Fortify;
use PragmaRX\Google2FA\Google2FA;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class AdministratorTwoFactorTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-08 staff-authentication */
    public function test_ca08_staff_authentication_admins_without_confirmed_two_factor_are_blocked(): void
    {
        Route::middleware(['auth:sanctum', 'administrator.two-factor'])
            ->get('/api/v1/__test/protected', fn () => response()->json(['ok' => true]))
            ->name('auth.test.protected');

        foreach (['admin', 'zoo-admin'] as $role) {
            $user = $this->createStaffUser($role);

            $this->actingAs($user, 'web')
                ->getJson('/api/v1/__test/protected')
                ->assertForbidden()
                ->assertJson([
                    'message' => 'Debes configurar tu segundo factor de autenticación.',
                    'code' => 'two_factor_setup_required',
                ]);
        }
    }

    /** CA-09 staff-authentication */
    public function test_ca09_staff_authentication_admin_two_factor_challenge_accepts_totp_and_consumes_recovery_codes(): void
    {
        $user = $this->createConfirmedTwoFactorUser('admin');
        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'SafePassphrase12!',
        ]);
        $loginResponse->assertOk()->assertJsonPath('two_factor', true);

        $totp = (new Google2FA)->getCurrentOtp('JBSWY3DPEHPK3PXP');
        $this->postJson('/api/v1/auth/two-factor-challenge', ['code' => $totp])
            ->assertNoContent();
        $this->assertAuthenticatedAs($user, 'web');

        $this->postJson('/api/v1/auth/logout')->assertNoContent();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'SafePassphrase12!',
        ])->assertOk()->assertJsonPath('two_factor', true);

        $this->postJson('/api/v1/auth/two-factor-challenge', ['recovery_code' => 'recovery-code-1234'])
            ->assertNoContent();

        $this->assertNotContains('recovery-code-1234', $user->fresh()->recoveryCodes());
    }

    /** CA-09 staff-authentication */
    public function test_ca09_staff_authentication_two_factor_challenge_is_limited_to_five_attempts(): void
    {
        $user = $this->createConfirmedTwoFactorUser('admin');
        $this->withSession(['login.id' => $user->id]);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/auth/two-factor-challenge', ['code' => '000000'])
                ->assertUnprocessable();
        }

        $this->postJson('/api/v1/auth/two-factor-challenge', ['code' => '000000'])
            ->assertTooManyRequests()
            ->assertJsonPath('message', fn (string $message) => str_contains($message, 'Demasiados intentos.'));
    }

    /** CA-10 staff-authentication */
    public function test_ca10_staff_authentication_admin_can_enroll_two_factor_and_read_recovery_codes_once(): void
    {
        $user = $this->createStaffUser('zoo-admin');
        $this->actingAs($user, 'web');

        $this->postJson('/api/v1/auth/user/two-factor-authentication')->assertOk();

        $this->getJson('/api/v1/auth/user/two-factor-secret-key')
            ->assertOk()
            ->assertJsonStructure(['secretKey']);

        $this->getJson('/api/v1/auth/user/two-factor-qr-code')
            ->assertOk()
            ->assertJson(fn ($json) => $json
                ->where('svg', fn (string $svg) => str_contains($svg, '<svg'))
                ->etc());

        $secret = Fortify::currentEncrypter()->decrypt($user->fresh()->two_factor_secret);
        $code = (new Google2FA)->getCurrentOtp($secret);

        $this->postJson('/api/v1/auth/user/confirmed-two-factor-authentication', ['code' => $code])
            ->assertOk();

        $this->assertNotNull($user->fresh()->two_factor_confirmed_at);
        $recoveryResponse = $this->getJson('/api/v1/auth/user/two-factor-recovery-codes')
            ->assertOk()
            ->assertJsonStructure(['0']);

        $this->assertNotEmpty($recoveryResponse->json());
    }

    private function createConfirmedTwoFactorUser(string $role): User
    {
        $user = $this->createStaffUser($role);
        $user->forceFill([
            'two_factor_secret' => Fortify::currentEncrypter()->encrypt('JBSWY3DPEHPK3PXP'),
            'two_factor_recovery_codes' => Fortify::currentEncrypter()->encrypt(json_encode(['recovery-code-1234'])),
            'two_factor_confirmed_at' => now(),
        ])->save();

        return $user->fresh();
    }
}
