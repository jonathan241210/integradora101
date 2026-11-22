<?php

namespace Tests\Feature\Admin;

use App\Models\TicketPrice;
use App\Models\User;
use App\Support\StepUp\StepUpWindow;
use Illuminate\Support\Facades\Hash;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\ConfirmsStepUp;

class StepUpAlwaysTest extends AdminFeatureTestCase
{
    use ConfirmsStepUp;

    private const NEW_PASSWORD = 'N3w!Passphrase#77';

    private const WRONG = 'Incorrecta12345!';

    /** CA-12 staff-step-up-confirmation */
    public function test_ca12_always_without_password_returns_403_even_with_window(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccountWithTwoFactor('zoo-admin');
        $prices = TicketPrice::query()->count();
        $hash = $target->password;

        foreach ($this->alwaysCalls($admin, $target, null) as $name => $call) {
            $call($this->actAsConfirmed($admin))
                ->assertForbidden()
                ->assertJsonPath('code', 'password_confirmation_required')
                ->assertJsonPath('mode', 'always');
        }

        $this->assertSame($prices, TicketPrice::query()->count());
        $this->assertSame($hash, $target->fresh()->password);
        $this->assertNotNull($target->fresh()->two_factor_secret);
        $this->assertSame(0, Activity::query()->where('causer_id', $admin->id)->whereIn('event', ['password-confirmation.succeeded', 'password-confirmation.failed'])->count());
    }

    /** CA-12 staff-step-up-confirmation: la contraseña solo se lee del cuerpo, nunca de la query. */
    public function test_ca12_password_in_the_query_does_not_confirm(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccountWithTwoFactor('zoo-admin');
        $prices = TicketPrice::query()->count();
        $query = '?password='.rawurlencode(self::STEP_UP_PASSWORD).'&current_password='.rawurlencode(self::STEP_UP_PASSWORD);

        $this->actAsConfirmed($admin)->postJson('/api/v1/admin/ticket-prices'.$query, ['adult_amount' => 30, 'child_amount' => 20, 'mode' => 'immediate'])
            ->assertForbidden()->assertJsonPath('mode', 'always');
        $this->actAsConfirmed($admin)->deleteJson("/api/v1/admin/users/{$target->id}/two-factor{$query}")
            ->assertForbidden()->assertJsonPath('mode', 'always');
        $this->actAsConfirmed($admin)->putJson("/api/v1/admin/users/{$target->id}/password{$query}", ['password' => self::NEW_PASSWORD])
            ->assertForbidden()->assertJsonPath('mode', 'always');

        $this->assertSame($prices, TicketPrice::query()->count());
        $this->assertNotNull($target->fresh()->two_factor_secret);
        $this->assertSame(0, Activity::query()->where('causer_id', $admin->id)->where('event', 'like', 'password-confirmation.%')->count());
    }

    /** CA-13 staff-step-up-confirmation */
    public function test_ca13_always_with_wrong_password_returns_422_without_changes(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccountWithTwoFactor('zoo-admin');
        $prices = TicketPrice::query()->count();
        $hash = $target->password;
        $calls = $this->alwaysCalls($admin, $target, self::WRONG);

        foreach ($calls as $call) {
            $call($this->actAsWithoutWindow($admin))
                ->assertStatus(422)
                ->assertJsonPath('message', 'La contraseña no es correcta.');
        }

        $this->assertSame($prices, TicketPrice::query()->count());
        $this->assertSame($hash, $target->fresh()->password);
        $this->assertNotNull($target->fresh()->two_factor_secret);
        $this->assertSame(count($calls), Activity::query()->where('causer_id', $admin->id)->where('event', 'password-confirmation.failed')->count());
    }

    /** CA-14 staff-step-up-confirmation */
    public function test_ca14_always_with_correct_password_runs_without_opening_a_window(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccountWithTwoFactor('zoo-admin');

        $prices = $this->actAsWithoutWindow($admin)->postJson('/api/v1/admin/ticket-prices', [
            'adult_amount' => 30, 'child_amount' => 20, 'mode' => 'immediate', 'password' => self::STEP_UP_PASSWORD,
        ])->assertCreated();
        $this->assertSame('30.00', $prices->json('data.current.adult.amount'));

        $this->actAsWithoutWindow($admin)
            ->putJson("/api/v1/admin/users/{$target->id}/password", ['current_password' => self::STEP_UP_PASSWORD, 'password' => self::NEW_PASSWORD])
            ->assertNoContent();
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $target->fresh()->password));

        $this->actAsWithoutWindow($admin)
            ->deleteJson("/api/v1/admin/users/{$target->id}/two-factor", ['password' => self::STEP_UP_PASSWORD])
            ->assertNoContent();
        $this->assertNull($target->fresh()->two_factor_secret);

        $this->assertNull(app('session')->driver()->get(StepUpWindow::KEY), 'Una operación Siempre no abre ventana.');
        $this->assertSame(3, Activity::query()->where('causer_id', $admin->id)->where('event', 'password-confirmation.succeeded')->count());

        // Con una ventana ya abierta, la operación Siempre no la altera.
        $this->actAsConfirmed($admin, 300);
        $until = app('session')->driver()->get(StepUpWindow::KEY);
        $this->actAsConfirmed($admin, 300)->postJson('/api/v1/admin/ticket-prices', [
            'adult_amount' => 31, 'child_amount' => 21, 'mode' => 'immediate', 'password' => self::STEP_UP_PASSWORD,
        ])->assertCreated();
        $this->assertSame($until, app('session')->driver()->get(StepUpWindow::KEY));
    }

    /** CA-37 staff-step-up-confirmation */
    public function test_ca37_reset_password_confirms_with_current_password(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccount('cashier');
        $hash = $target->password;
        $url = "/api/v1/admin/users/{$target->id}/password";

        // Sin current_password: 403 aunque haya ventana; `password` (aunque sea la del administrador) no confirma.
        $this->actAsConfirmed($admin)->putJson($url, ['password' => self::NEW_PASSWORD])
            ->assertForbidden()->assertJsonPath('code', 'password_confirmation_required')->assertJsonPath('mode', 'always');
        $this->actAsConfirmed($admin)->putJson($url, ['password' => self::STEP_UP_PASSWORD])
            ->assertForbidden()->assertJsonPath('mode', 'always');
        $this->assertSame($hash, $target->fresh()->password);

        $this->actAsWithoutWindow($admin)->putJson($url, ['current_password' => self::WRONG, 'password' => self::NEW_PASSWORD])
            ->assertStatus(422)->assertJsonPath('message', 'La contraseña no es correcta.');
        $this->assertSame($hash, $target->fresh()->password);
        $this->assertSame(1, Activity::query()->where('causer_id', $admin->id)->where('event', 'password-confirmation.failed')->count());

        $this->actAsWithoutWindow($admin)->putJson($url, ['current_password' => self::STEP_UP_PASSWORD, 'password' => 'weak'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertSame($hash, $target->fresh()->password);

        $this->actAsWithoutWindow($admin)->putJson($url, ['current_password' => self::STEP_UP_PASSWORD, 'password' => self::NEW_PASSWORD])
            ->assertNoContent();
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $target->fresh()->password));
    }

    private function createAccountWithTwoFactor(string $role): User
    {
        $target = $this->createAccount($role);
        $target->forceFill([
            'two_factor_secret' => encrypt('SECRET'),
            'two_factor_recovery_codes' => encrypt(json_encode(['a'])),
        ])->save();

        return $target;
    }

    /**
     * Una llamada por operación «Siempre» (ticket-prices, 2FA y contraseña de otra cuenta).
     * La del cambio de contraseña lleva la confirmación en `current_password` (CA-37).
     *
     * @return array<string, callable>
     */
    private function alwaysCalls(User $admin, User $target, ?string $password): array
    {
        $confirm = $password === null ? [] : ['password' => $password];
        $reset = ['password' => self::NEW_PASSWORD] + ($password === null ? [] : ['current_password' => $password]);

        return [
            'prices' => fn ($t) => $t->postJson('/api/v1/admin/ticket-prices', ['adult_amount' => 30, 'child_amount' => 20, 'mode' => 'immediate'] + $confirm),
            'password' => fn ($t) => $t->putJson("/api/v1/admin/users/{$target->id}/password", $reset),
            'two-factor' => fn ($t) => $t->deleteJson("/api/v1/admin/users/{$target->id}/two-factor", $confirm),
        ];
    }
}
