<?php

namespace Tests\Feature\Auth;

use Illuminate\Session\DatabaseSessionHandler;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class SessionExpiryTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-12 staff-authentication */
    public function test_ca12_staff_authentication_session_expires_after_thirty_one_minutes(): void
    {
        config([
            'session.driver' => 'database',
            'sanctum.stateful' => ['localhost:5174'],
        ]);
        $user = $this->createStaffUser('executive');

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'SafePassphrase12!',
        ])->assertOk()->assertJsonPath('two_factor', false);

        $session = $this->app['session']->driver();
        $sessionId = $session->getId();
        $this->assertSame('database', config('session.driver'));
        $this->assertSame(30, config('session.lifetime'));
        $this->assertInstanceOf(DatabaseSessionHandler::class, $session->getHandler());
        $this->assertDatabaseHas('sessions', ['id' => $sessionId]);

        $this->travel(31)->minutes();
        DB::table('sessions')->where('id', $sessionId)->update([
            'last_activity' => now()->subMinutes(31)->getTimestamp(),
        ]);
        $this->assertSame('', $session->getHandler()->read($sessionId));
        $this->app['session']->forgetDrivers();
        $this->app->forgetInstance('session.store');
        Auth::forgetGuards();
        $this->assertGuest('web');

        $this->withCookie(config('session.cookie'), Crypt::encryptString($sessionId))
            ->withHeader('Origin', 'http://localhost:5174')
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized();
    }
}
