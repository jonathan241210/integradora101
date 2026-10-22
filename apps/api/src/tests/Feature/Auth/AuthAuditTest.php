<?php

namespace Tests\Feature\Auth;

use Laravel\Fortify\Fortify;
use PragmaRX\Google2FA\Google2FA;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class AuthAuditTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-13 staff-authentication */
    public function test_ca13_staff_authentication_logs_login_failure_logout_and_two_factor_without_secrets(): void
    {
        $user = $this->createStaffUser('executive');

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'WrongPassword12!',
        ])->assertUnprocessable();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'SafePassphrase12!',
        ])->assertOk()->assertJsonPath('two_factor', false);

        $this->assertNotNull($user->fresh()->last_login_at);
        $this->postJson('/api/v1/auth/logout')->assertNoContent();

        $admin = $this->createStaffUser('admin');
        $this->actingAs($admin, 'web')
            ->postJson('/api/v1/auth/user/two-factor-authentication')
            ->assertOk();

        $secret = Fortify::currentEncrypter()->decrypt($admin->fresh()->two_factor_secret);
        $code = (new Google2FA)->getCurrentOtp($secret);
        $this->postJson('/api/v1/auth/user/confirmed-two-factor-authentication', ['code' => $code])
            ->assertOk();

        $events = Activity::query()->where('log_name', 'auth')->get();

        $this->assertTrue($events->contains(fn (Activity $activity) => $activity->event === 'failed'));
        $this->assertTrue($events->contains(fn (Activity $activity) => $activity->event === 'login'));
        $this->assertTrue($events->contains(fn (Activity $activity) => $activity->event === 'logout'));
        $this->assertTrue($events->contains(fn (Activity $activity) => $activity->event === 'two_factor_confirmed'));

        foreach ($events as $activity) {
            $properties = $activity->properties->toArray();
            $this->assertArrayHasKey('email', $properties);
            $this->assertArrayHasKey('ip', $properties);
            $this->assertArrayHasKey('user_agent', $properties);
            $this->assertStringNotContainsString('SafePassphrase12!', json_encode($properties));
            $this->assertStringNotContainsString('WrongPassword12!', json_encode($properties));
        }
    }
}
