<?php

namespace Tests\Feature\Visitor;

use Spatie\Activitylog\Models\Activity;

class AuditTest extends VisitorFeatureTestCase
{
    /** CA-19 */
    public function test_ca19_access_log_omits_secrets(): void
    {
        $visitor = $this->verifiedVisitor();
        $login = $this->loginVisitor($visitor['email'])->assertOk();
        $access = $login->json('data.access_token');
        $refresh = $login->json('data.refresh_token');
        $rotated = $this->postJson('/api/v1/visitor/auth/refresh', [
            'refresh_token' => $refresh,
        ])->assertOk();

        $this->withVisitorToken($rotated->json('data.access_token'))
            ->postJson('/api/v1/visitor/auth/logout', [
                'refresh_token' => $rotated->json('data.refresh_token'),
            ])->assertNoContent();

        $this->postJson('/api/v1/visitor/auth/password/forgot', [
            'email' => $visitor['email'],
        ])->assertStatus(202);
        $code = $this->latestVisitorCode();
        $this->postJson('/api/v1/visitor/auth/password/reset', [
            'email' => $visitor['email'],
            'code' => $code,
            'password' => 'nueva1234',
            'password_confirmation' => 'nueva1234',
        ])->assertOk();

        $again = $this->loginVisitor($visitor['email'], 'nueva1234')->assertOk();
        $this->withVisitorToken($again->json('data.access_token'))
            ->deleteJson('/api/v1/visitor/me', ['password' => 'nueva1234'])
            ->assertNoContent();

        $events = Activity::query()->where('log_name', 'visitor-auth')->get()
            ->filter(fn (Activity $activity) => ($activity->properties['email'] ?? null) === $visitor['email']);
        foreach (['registered', 'login', 'refresh', 'logout', 'password_reset', 'deleted'] as $event) {
            $this->assertTrue($events->contains(fn (Activity $activity) => $activity->event === $event), $event);
        }

        $encoded = json_encode($events->map->properties);
        $this->assertStringNotContainsString('secreta12', $encoded);
        $this->assertStringNotContainsString('nueva1234', $encoded);
        $this->assertStringNotContainsString($code, $encoded);
        $this->assertStringNotContainsString($access, $encoded);
        $this->assertStringNotContainsString($refresh, $encoded);
    }
}
