<?php

namespace Tests\Feature\Console;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ArcaAdminResetTest extends ConsoleAdminTestCase
{
    /** CA-23 api-023 */
    public function test_ca23_reset_password_bcrypt_revokes_sessions(): void
    {
        $admin = $this->createAccount('admin');
        $session = $this->insertSession($admin);
        $password = 'NuevaClave!Segura42';
        $this->primary();

        $this->artisan('arca:admin:reset-password', ['email' => $admin->email, '--reason' => self::REASON])
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)
            ->expectsQuestion('Contraseña nueva', $password)
            ->expectsQuestion('Confirma la contraseña nueva', $password)
            ->expectsConfirmation(self::CONFIRM_PROMPT, 'yes')
            ->assertExitCode(0);

        $fresh = $admin->fresh();
        $this->assertStringStartsWith('$2y$', $fresh->password);
        $this->assertTrue(password_verify($password, $fresh->password));
        $this->assertFalse(DB::table('sessions')->where('id', $session)->exists());
    }

    /** CA-23 api-023 */
    public function test_ca23_reset_two_factor_clears_secret_and_requires_setup(): void
    {
        $admin = $this->createAccount('admin');
        $admin->forceFill([
            'two_factor_secret' => encrypt('SECRETO'),
            'two_factor_recovery_codes' => encrypt(json_encode(['a-1', 'b-2'])),
            'two_factor_confirmed_at' => now(),
        ])->save();
        $session = $this->insertSession($admin);

        $this->artisan('arca:admin:reset-two-factor', ['email' => $admin->email, '--confirm-email' => $admin->email] + $this->unattended())->assertExitCode(0);

        $fresh = $admin->fresh();
        $this->assertNull($fresh->two_factor_secret);
        $this->assertNull($fresh->two_factor_recovery_codes);
        $this->assertNull($fresh->two_factor_confirmed_at);
        $this->assertFalse(DB::table('sessions')->where('id', $session)->exists());

        Auth::forgetGuards();
        $this->actingAs($fresh, 'web')->getJson('/api/v1/auth/me')
            ->assertOk()->assertJsonPath('data.two_factor_setup_required', true);
    }
}
