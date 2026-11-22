<?php

namespace Tests\Feature\Admin;

use App\Models\TicketPrice;
use App\Support\StepUp\StepUpWindow;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\RateLimiter;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\ConfirmsStepUp;

class StepUpAttemptLimitTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures, ConfirmsStepUp;

    private const CONFIRMATION_URL = '/api/v1/admin/password-confirmation';

    private const WRONG = 'Incorrecta12345!';

    protected function setUp(): void
    {
        parent::setUp();

        // El límite de frecuencia de la ruta (10 por minuto) tiene su propia prueba; aquí se mide el de contraseñas.
        RateLimiter::for('password-confirmation', fn () => Limit::none());
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** CA-27 staff-step-up-confirmation */
    public function test_ca27_five_failures_lock_for_ten_minutes_in_window_and_always(): void
    {
        $start = Carbon::parse('2026-11-20 12:00:00', 'UTC');
        Carbon::setTestNow($start);
        $admin = $this->createAccount('admin');
        $prices = TicketPrice::query()->count();

        // Cinco fallos separados: el primero en T y el quinto en T+5 min (tres en Ventana y dos en Siempre, mismo usuario).
        $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::WRONG])->assertStatus(422);
        foreach ([1, 2] as $minute) {
            Carbon::setTestNow($start->copy()->addMinutes($minute));
            $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::WRONG])->assertStatus(422);
        }
        Carbon::setTestNow($start->copy()->addMinutes(3));
        $this->actAsWithoutWindow($admin)->postJson('/api/v1/admin/ticket-prices', $this->priceBody(self::WRONG))->assertStatus(422);
        $fifth = $start->copy()->addMinutes(5);
        Carbon::setTestNow($fifth);
        $this->actAsWithoutWindow($admin)->postJson('/api/v1/admin/ticket-prices', $this->priceBody(self::WRONG))->assertStatus(422);

        // El intento siguiente, aunque la contraseña sea correcta, responde 429 y no ejecuta nada.
        $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])
            ->assertStatus(429)
            ->assertHeader('Retry-After', '600')
            ->assertJsonPath('message', 'Demasiados intentos. Intenta de nuevo en 600 segundos.');
        $this->assertNull(app('session')->driver()->get(StepUpWindow::KEY));

        $this->actAsWithoutWindow($admin)->postJson('/api/v1/admin/ticket-prices', $this->priceBody(self::STEP_UP_PASSWORD))
            ->assertStatus(429);
        $this->assertSame($prices, TicketPrice::query()->count());

        // A T+10 min (diez minutos desde el primer fallo) sigue bloqueado: el bloqueo cuenta desde el quinto fallo.
        Carbon::setTestNow($start->copy()->addMinutes(10)->addSecond());
        $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])
            ->assertStatus(429)
            ->assertHeader('Retry-After', '299');

        Carbon::setTestNow($fifth->copy()->addSeconds(599));
        $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])
            ->assertStatus(429)->assertHeader('Retry-After', '1');

        Carbon::setTestNow($fifth->copy()->addSeconds(601));
        $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertOk();
        $this->actAsWithoutWindow($admin)->postJson('/api/v1/admin/ticket-prices', $this->priceBody(self::STEP_UP_PASSWORD))->assertCreated();

        // El límite es por usuario: otra cuenta no está bloqueada.
        $other = $this->createAccount('admin');
        $this->actAsWithoutWindow($other)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertOk();
    }

    /** CA-27 staff-step-up-confirmation: solo el primer intento bloqueado de cada bloqueo se audita. */
    public function test_ca27_only_the_first_blocked_attempt_is_audited(): void
    {
        $start = Carbon::parse('2026-11-20 12:00:00', 'UTC');
        Carbon::setTestNow($start);
        $admin = $this->createAccount('admin');

        for ($i = 0; $i < 5; $i++) {
            $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::WRONG])->assertStatus(422);
        }
        for ($i = 0; $i < 4; $i++) {
            $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertStatus(429);
        }

        $locked = fn () => Activity::query()->where('causer_id', $admin->id)->where('event', 'password-confirmation.failed')
            ->where('properties->locked', true)->count();
        $this->assertSame(1, $locked());
        $this->assertSame(6, Activity::query()->where('causer_id', $admin->id)->where('event', 'password-confirmation.failed')->count());

        // Un segundo periodo de bloqueo vuelve a auditar su primer intento bloqueado.
        Carbon::setTestNow($start->copy()->addSeconds(601));
        for ($i = 0; $i < 5; $i++) {
            $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::WRONG])->assertStatus(422);
        }
        $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertStatus(429);
        $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertStatus(429);
        $this->assertSame(2, $locked());
    }

    /** CA-28 staff-step-up-confirmation */
    public function test_ca28_audit_records_succeeded_and_failed_without_password(): void
    {
        $admin = $this->createAccount('admin');
        $hash = $admin->password;

        $this->actAsWithoutWindow($admin)->withHeader('User-Agent', 'PHPUnit-StepUp')
            ->postJson(self::CONFIRMATION_URL, ['password' => self::WRONG])->assertStatus(422);
        $this->actAsWithoutWindow($admin)->withHeader('User-Agent', 'PHPUnit-StepUp')
            ->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertOk();
        $this->actAsWithoutWindow($admin)->postJson('/api/v1/admin/ticket-prices', $this->priceBody(self::STEP_UP_PASSWORD))->assertCreated();

        $events = Activity::query()->where('causer_id', $admin->id)
            ->whereIn('event', ['password-confirmation.succeeded', 'password-confirmation.failed'])->orderBy('id')->get();

        $this->assertSame(['password-confirmation.failed', 'password-confirmation.succeeded', 'password-confirmation.succeeded'], $events->pluck('event')->all());
        $this->assertSame(['auth'], $events->pluck('log_name')->unique()->values()->all());

        $failed = $events[0]->properties;
        $this->assertSame($admin->email, $failed['email']);
        $this->assertSame('PHPUnit-StepUp', $failed['user_agent']);
        $this->assertSame('admin.password-confirmation.store', $failed['route']);
        $this->assertArrayHasKey('ip', $failed->toArray());
        $this->assertSame('admin.ticket-prices.store', $events[2]->properties['route']);
        $this->assertSame('always', $events[2]->properties['mode']);

        $dump = json_encode($events->map->getAttributes()->all());
        $this->assertStringNotContainsString(self::STEP_UP_PASSWORD, $dump);
        $this->assertStringNotContainsString(self::WRONG, $dump);
        $this->assertStringNotContainsString($hash, $dump);
        $this->assertStringNotContainsString('two_factor', $dump);
    }

    /** CA-29 staff-step-up-confirmation */
    public function test_ca29_403_for_missing_confirmation_neither_counts_nor_audits(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $this->makeQr($enclosure);

        for ($i = 0; $i < 8; $i++) {
            $this->actAsWithoutWindow($admin)->postJson("/api/v1/admin/enclosures/{$enclosure->id}/qr/regenerate")->assertForbidden();
            $this->actAsWithoutWindow($admin)->postJson('/api/v1/admin/ticket-prices', ['adult_amount' => 30, 'child_amount' => 20, 'mode' => 'immediate'])->assertForbidden();
        }

        $this->assertSame(0, Activity::query()->where('causer_id', $admin->id)->where('event', 'like', 'password-confirmation.%')->count());
        $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertOk();
    }

    /** CA-41 staff-step-up-confirmation */
    public function test_ca41_success_without_lock_clears_previous_failures(): void
    {
        $start = Carbon::parse('2026-11-20 12:00:00', 'UTC');
        Carbon::setTestNow($start);
        $admin = $this->createAccount('admin');

        $this->failTimes($admin, 4);
        $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertOk();

        // Si el acierto no hubiera borrado los 4 fallos, el quinto de esta tanda ya bloquearía.
        $this->failTimes($admin, 4);
        $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertOk();

        // Con bloqueo activo, la contraseña correcta responde 429 y no desbloquea.
        $this->failTimes($admin, 5);
        $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertStatus(429);
        $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertStatus(429);

        Carbon::setTestNow($start->copy()->addSeconds(601));
        $this->actAsWithoutWindow($admin)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertOk();
    }

    private function failTimes($user, int $times): void
    {
        for ($i = 0; $i < $times; $i++) {
            $this->actAsWithoutWindow($user)->postJson(self::CONFIRMATION_URL, ['password' => self::WRONG])->assertStatus(422);
        }
    }

    private function priceBody(string $password): array
    {
        return ['adult_amount' => 30, 'child_amount' => 20, 'mode' => 'immediate', 'password' => $password];
    }
}
