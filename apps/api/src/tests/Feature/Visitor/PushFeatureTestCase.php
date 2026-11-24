<?php

namespace Tests\Feature\Visitor;

use App\Models\Visitor;
use App\Models\VisitorNotificationPreference;
use App\Push\FakePushGateway;
use App\Push\PushGateway;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;

abstract class PushFeatureTestCase extends VisitorFeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;

    protected FakePushGateway $push;

    protected function setUp(): void
    {
        parent::setUp();

        config(['push.enabled' => true]);
        $this->push = new FakePushGateway;
        $this->app->instance(PushGateway::class, $this->push);
    }

    /**
     * @param  array{email: string, password: string, access_token: string, refresh_token: string}  $visitor
     */
    protected function registerPhone(array $visitor, string $token = 'ExponentPushToken[one]'): void
    {
        $this->withVisitorToken($visitor['access_token'])
            ->putJson('/api/v1/visitor/push-tokens', [
                'token' => $token,
                'platform' => 'android',
            ])
            ->assertOk()
            ->assertJsonPath('data.platform', 'android');
    }

    /**
     * @param  array{access_token: string}  $visitor
     */
    protected function setNewsPreference(array $visitor, bool $enabled): void
    {
        $this->withVisitorToken($visitor['access_token'])
            ->patchJson('/api/v1/visitor/notification-preferences', [
                'news_and_events' => $enabled,
            ])
            ->assertOk()
            ->assertJsonPath('data.news_and_events', $enabled);
    }

    protected function visitorModel(array $visitor): Visitor
    {
        return Visitor::query()->where('email', $visitor['email'])->firstOrFail();
    }

    protected function assertPayloadPrivate(array $message): void
    {
        $encoded = json_encode($message, JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString('@', $encoded);
        $this->assertArrayNotHasKey('email', $message);
        $this->assertArrayNotHasKey('opinion', $message['data']);
        $this->assertArrayNotHasKey('reason', $message['data']);
        $this->assertArrayNotHasKey('image', $message['data']);
        $this->assertArrayNotHasKey('url', $message['data']);
    }

    protected function preferenceRow(Visitor $visitor): ?VisitorNotificationPreference
    {
        return VisitorNotificationPreference::query()->find($visitor->id);
    }
}
