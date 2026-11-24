<?php

namespace Tests\Feature\Auth;

use App\Support\StepUp\StepUpWindow;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\ConfirmsStepUp;
use Tests\Concerns\CreatesAdministrators;
use Tests\FeatureTestCase;

class PasswordConfirmationTest extends FeatureTestCase
{
    use BuildsEnclosureFixtures, ConfirmsStepUp, CreatesAdministrators;

    private const CONFIRMATION_URL = '/api/v1/admin/password-confirmation';

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** CA-06 staff-step-up-confirmation */
    public function test_ca06_correct_confirmation_opens_a_window_and_does_not_store_the_password(): void
    {
        $now = Carbon::parse('2026-11-20 12:00:00', 'UTC');
        Carbon::setTestNow($now);
        $user = $this->createAccount('admin');

        $response = $this->actAsWithoutWindow($user)
            ->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])
            ->assertOk()
            ->assertJsonPath('data.confirmed_until', '2026-11-20T12:10:00Z');

        $this->assertStringNotContainsString(self::STEP_UP_PASSWORD, $response->getContent());
        $this->assertSame($now->getTimestamp() + 600, app('session')->driver()->get(StepUpWindow::KEY));
        $this->assertSame($user->id, app('session')->driver()->get(StepUpWindow::USER_KEY));
        $this->assertStringNotContainsString(self::STEP_UP_PASSWORD, json_encode(app('session')->driver()->all()));
        $this->assertSame(0, Activity::query()->where('properties', 'like', '%'.self::STEP_UP_PASSWORD.'%')->count());
    }

    /** CA-07 staff-step-up-confirmation */
    public function test_ca07_wrong_confirmation_returns_422_and_does_not_open_a_window(): void
    {
        $user = $this->createAccount('admin');

        $this->actAsWithoutWindow($user)
            ->postJson(self::CONFIRMATION_URL, ['password' => 'Incorrecta12345!'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'La contraseña no es correcta.')
            ->assertJsonPath('errors.password.0', 'La contraseña no es correcta.');

        $this->assertNull(app('session')->driver()->get(StepUpWindow::KEY));
        $this->assertSame(1, Activity::query()->where('event', 'password-confirmation.failed')->where('causer_id', $user->id)->count());
    }

    /** CA-08 staff-step-up-confirmation */
    public function test_ca08_window_accepts_at_9m59s_and_rejects_at_10m1s_without_extending(): void
    {
        $start = Carbon::parse('2026-11-20 12:00:00', 'UTC');
        Carbon::setTestNow($start);
        $user = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $this->makeQr($enclosure);
        $url = "/api/v1/admin/enclosures/{$enclosure->id}/qr/regenerate";

        $this->actAsWithoutWindow($user)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertOk();

        Carbon::setTestNow($start->copy()->addSeconds(599));
        $this->actAsWithoutWindow($user)->postJson($url)->assertOk();

        Carbon::setTestNow($start->copy()->addSeconds(601));
        $this->actAsWithoutWindow($user)->postJson($url)
            ->assertForbidden()
            ->assertJsonPath('code', 'password_confirmation_required')
            ->assertJsonPath('mode', 'window');
    }

    /** CA-09 staff-step-up-confirmation */
    public function test_ca09_window_is_not_shared_between_sessions(): void
    {
        $user = $this->databaseSessionUser();

        $sessionA = $this->loginAndGetSessionId($user);
        $this->requestWithSession($sessionA)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertOk();
        $this->requestWithSession($sessionA)->getJson('/api/v1/__test/window')->assertOk();

        $sessionB = $this->loginAndGetSessionId($user);
        $this->assertNotSame($sessionA, $sessionB);
        $this->requestWithSession($sessionB)->getJson('/api/v1/__test/window')
            ->assertForbidden()
            ->assertJsonPath('code', 'password_confirmation_required');

        $this->requestWithSession($sessionA)->getJson('/api/v1/__test/window')->assertOk();
    }

    /** CA-09 staff-step-up-confirmation: la ventana guarda al usuario que confirmó y no vale para otro. */
    public function test_ca09_another_users_window_is_not_valid(): void
    {
        $owner = $this->createAccount('admin');
        $other = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $this->makeQr($enclosure);
        $url = "/api/v1/admin/enclosures/{$enclosure->id}/qr/regenerate";

        // Ventana abierta por `owner` en la sesión; `other` llega con esa misma sesión.
        $this->actAsConfirmed($owner);
        $this->assertTrue(StepUpWindow::isOpen(app('session')->driver(), $owner->id));
        $this->assertFalse(StepUpWindow::isOpen(app('session')->driver(), $other->id));

        Auth::forgetGuards();
        $this->withHeader('Origin', self::STEP_UP_ORIGIN)->actingAs($other, 'web');
        $this->postJson($url)->assertForbidden()->assertJsonPath('code', 'password_confirmation_required');
    }

    /** CA-10 staff-step-up-confirmation */
    public function test_ca10_logout_and_new_login_remove_the_window(): void
    {
        $user = $this->databaseSessionUser();

        $session = $this->loginAndGetSessionId($user);
        $this->requestWithSession($session)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertOk();
        $this->requestWithSession($session)->getJson('/api/v1/__test/window')->assertOk();

        $this->requestWithSession($session)->postJson('/api/v1/auth/logout')->assertNoContent();

        $next = $this->loginAndGetSessionId($user);
        $this->requestWithSession($next)->getJson('/api/v1/__test/window')
            ->assertForbidden()
            ->assertJsonPath('code', 'password_confirmation_required');
    }

    /** CA-10 staff-step-up-confirmation: defensa adicional, el inicio y el cierre de sesión borran la ventana aunque los atributos se conserven. */
    public function test_ca10_login_and_logout_events_clear_the_session_window(): void
    {
        $user = $this->createAccount('veterinarian', false);

        foreach ([new Login('web', $user, false), new Logout('web', $user)] as $event) {
            $session = app('session')->driver();
            StepUpWindow::open($session, $user->id);
            $request = Request::create('/');
            $request->setLaravelSession($session);
            app()->instance('request', $request);

            event($event);

            $this->assertFalse(StepUpWindow::isOpen($session, $user->id));
            $this->assertNull($session->get(StepUpWindow::USER_KEY));
        }
    }

    /** CA-11 staff-step-up-confirmation */
    public function test_ca11_expired_session_returns_401_not_403(): void
    {
        $user = $this->databaseSessionUser();

        $session = $this->loginAndGetSessionId($user);
        $this->requestWithSession($session)->postJson(self::CONFIRMATION_URL, ['password' => self::STEP_UP_PASSWORD])->assertOk();

        $this->travel(31)->minutes();
        DB::table('sessions')->where('id', $session)->update(['last_activity' => now()->subMinutes(31)->getTimestamp()]);

        $this->requestWithSession($session)->getJson('/api/v1/__test/window')->assertUnauthorized();
    }

    /** Cuenta de un rol sin 2FA obligatorio (`veterinarian`; `executive` ya exige 2FA por api-023), con sesiones reales en la tabla `sessions` y una ruta de ventana de prueba. */
    private function databaseSessionUser()
    {
        config(['session.driver' => 'database', 'sanctum.stateful' => ['localhost:5174']]);
        Route::middleware(['api', 'auth:sanctum', 'staff.user', 'step-up:window'])
            ->get('/api/v1/__test/window', fn () => response()->json(['ok' => true]))
            ->name('test.step-up.window');

        return $this->createAccount('veterinarian', false);
    }

    private function loginAndGetSessionId($user): string
    {
        $this->newRequestCycle();
        $this->defaultCookies = [];

        $this->withHeader('Origin', self::STEP_UP_ORIGIN)
            ->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => self::STEP_UP_PASSWORD])
            ->assertOk();

        return app('session')->driver()->getId();
    }

    private function requestWithSession(string $sessionId): static
    {
        $this->newRequestCycle();

        // Las peticiones JSON solo envían cookies con withCredentials().
        return $this->withHeader('Origin', self::STEP_UP_ORIGIN)
            ->withCredentials()
            ->withCookie(config('session.cookie'), $sessionId);
    }

    /** Simula una petición nueva: el contenedor olvida el almacén de sesión y los guards en memoria. */
    private function newRequestCycle(): void
    {
        $this->app['session']->forgetDrivers();
        $this->app->forgetInstance('session.store');
        Auth::forgetGuards();
    }
}
