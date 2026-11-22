<?php

namespace Tests\Feature\Auth;

use Illuminate\Support\Facades\DB;
use Laravel\Fortify\Fortify;
use PragmaRX\Google2FA\Google2FA;
use Tests\Concerns\ConfirmsStepUp;
use Tests\Concerns\CreatesAdministrators;
use Tests\FeatureTestCase;

class CashierTwoFactorTest extends FeatureTestCase
{
    use ConfirmsStepUp, CreatesAdministrators;

    /** CA-01 staff-step-up-confirmation */
    public function test_ca01_cashier_without_2fa_gets_two_factor_setup_required_in_admin(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $tickets = DB::table('tickets')->count();

        $this->actAsConfirmed($cashier)->getJson('/api/v1/admin/tickets')
            ->assertForbidden()
            ->assertJsonPath('code', 'two_factor_setup_required');

        $this->actAsConfirmed($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 0])
            ->assertForbidden()
            ->assertJsonPath('code', 'two_factor_setup_required');

        $this->assertSame($tickets, DB::table('tickets')->count());

        $this->actAsConfirmed($cashier)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.two_factor_setup_required', true);
    }

    /** CA-02 staff-step-up-confirmation */
    public function test_ca02_cashier_without_2fa_can_read_me_log_out_and_enroll(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->actingAs($cashier, 'web');

        $this->getJson('/api/v1/auth/me')->assertOk();
        $this->postJson('/api/v1/auth/user/two-factor-authentication')->assertOk();

        $secret = Fortify::currentEncrypter()->decrypt($cashier->fresh()->two_factor_secret);
        $this->postJson('/api/v1/auth/user/confirmed-two-factor-authentication', [
            'code' => (new Google2FA)->getCurrentOtp($secret),
        ])->assertOk();
        $this->assertNotNull($cashier->fresh()->two_factor_confirmed_at);

        $other = $this->createAccount('cashier', false);
        $this->actingAs($other, 'web')->postJson('/api/v1/auth/logout')->assertNoContent();
    }

    /** CA-03 staff-step-up-confirmation */
    public function test_ca03_cashier_with_2fa_gets_a_challenge_and_no_data_until_completed(): void
    {
        $cashier = $this->createAccount('cashier');
        $cashier->forceFill([
            'two_factor_secret' => Fortify::currentEncrypter()->encrypt('JBSWY3DPEHPK3PXP'),
            'two_factor_recovery_codes' => Fortify::currentEncrypter()->encrypt(json_encode(['recovery-code-1234'])),
        ])->save();

        $this->postJson('/api/v1/auth/login', [
            'email' => $cashier->email,
            'password' => self::STEP_UP_PASSWORD,
        ])->assertOk()->assertJsonPath('two_factor', true);

        $this->assertGuest('web');
        $this->getJson('/api/v1/admin/tickets')->assertUnauthorized();
    }

    /** CA-04 staff-step-up-confirmation */
    public function test_ca04_veterinarian_without_2fa_enters_without_enrollment(): void
    {
        $vet = $this->createAccount('veterinarian', false);

        $this->postJson('/api/v1/auth/login', [
            'email' => $vet->email,
            'password' => self::STEP_UP_PASSWORD,
        ])->assertOk()->assertJsonPath('two_factor', false);

        $this->assertAuthenticatedAs($vet, 'web');
        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.two_factor_setup_required', false);
    }

    /** CA-05 staff-step-up-confirmation */
    public function test_ca05_admin_and_zoo_admin_keep_api_003_2fa(): void
    {
        foreach (['admin', 'zoo-admin'] as $role) {
            $unconfirmed = $this->createAccount($role, false);
            $this->actAsConfirmed($unconfirmed)->getJson('/api/v1/admin/users')
                ->assertForbidden()
                ->assertJsonPath('code', 'two_factor_setup_required');

            $confirmed = $this->createAccount($role);
            $this->actAsConfirmed($confirmed)->getJson('/api/v1/auth/me')
                ->assertOk()
                ->assertJsonPath('data.two_factor_setup_required', false);
        }
    }

    /** CA-30 staff-step-up-confirmation */
    public function test_ca30_cashier_with_2fa_sells_and_reads_history_with_api_009_shape(): void
    {
        $cashier = $this->createAccount('cashier');
        $this->seedPrices($cashier);

        $sale = $this->actAsWithoutWindow($cashier)
            ->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 1])
            ->assertCreated()
            ->assertJsonStructure(['data' => ['tickets' => [['folio', 'status', 'total_amount']]]]);

        $this->actAsWithoutWindow($cashier)->getJson('/api/v1/admin/tickets')
            ->assertOk()
            ->assertJsonStructure(['data' => [['folio', 'status']]]);

        $this->assertNotEmpty($sale->json('data.tickets'));
    }

    /** CA-31 staff-step-up-confirmation */
    public function test_ca31_two_factor_roles_contains_cashier_and_not_veterinarian(): void
    {
        $roles = config('arca.two_factor_roles');

        $this->assertContains('admin', $roles);
        $this->assertContains('zoo-admin', $roles);
        $this->assertContains('cashier', $roles);
        $this->assertNotContains('veterinarian', $roles);
        // api-023 CA-04: `executive` y `communications` también exigen 2FA.
        $this->assertContains('executive', $roles);
        $this->assertContains('communications', $roles);
    }

    private function seedPrices($creator): void
    {
        DB::table('ticket_prices')->delete();
        foreach (['adult' => '25.00', 'child' => '16.00'] as $type => $amount) {
            DB::table('ticket_prices')->insert([
                'ticket_type' => $type, 'amount' => $amount, 'effective_at' => '2020-01-01 00:00:00',
                'created_by' => $creator->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }
}
