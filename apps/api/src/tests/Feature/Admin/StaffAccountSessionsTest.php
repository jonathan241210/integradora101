<?php

namespace Tests\Feature\Admin;

use Illuminate\Session\DatabaseSessionHandler;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

class StaffAccountSessionsTest extends AdminFeatureTestCase
{
    /** CA-10 */
    public function test_ca10_administration_management_password_reset_ends_the_real_session_of_the_account(): void
    {
        config([
            'session.driver' => 'database',
            'sanctum.stateful' => ['localhost:5174'],
        ]);
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');

        $this->postJson('/api/v1/auth/login', ['email' => $cashier->email, 'password' => 'SafePassphrase12!'])->assertOk();

        $session = $this->app['session']->driver();
        $sessionId = $session->getId();
        $this->assertSame('database', config('session.driver'));
        $this->assertInstanceOf(DatabaseSessionHandler::class, $session->getHandler());
        $this->assertDatabaseHas('sessions', ['id' => $sessionId, 'user_id' => $cashier->id]);

        $this->actAs($admin)->putJson("/api/v1/admin/users/{$cashier->id}/password", ['password' => 'N3w!Passphrase#77'])->assertNoContent();
        $this->assertSame(0, DB::table('sessions')->where('user_id', $cashier->id)->count());

        $this->app['session']->forgetDrivers();
        $this->app->forgetInstance('session.store');
        Auth::forgetGuards();

        $this->withCookie(config('session.cookie'), Crypt::encryptString($sessionId))
            ->withHeader('Origin', 'http://localhost:5174')
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized();
    }
}
