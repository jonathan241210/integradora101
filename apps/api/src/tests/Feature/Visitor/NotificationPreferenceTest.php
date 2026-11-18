<?php

namespace Tests\Feature\Visitor;

use App\Models\VisitorNotificationPreference;

class NotificationPreferenceTest extends PushFeatureTestCase
{
    /** CA-04 */
    public function test_ca04_first_read_uses_defaults_and_patch_persists_booleans(): void
    {
        $visitor = $this->verifiedVisitor();
        $account = $this->visitorModel($visitor);

        $this->withVisitorToken($visitor['access_token'])
            ->getJson('/api/v1/visitor/notification-preferences')
            ->assertOk()
            ->assertJsonPath('data.news_and_events', false)
            ->assertJsonPath('data.memory_status', true);
        $this->assertNull(VisitorNotificationPreference::query()->find($account->id));

        $this->withVisitorToken($visitor['access_token'])
            ->patchJson('/api/v1/visitor/notification-preferences', ['news_and_events' => true])
            ->assertOk()
            ->assertJsonPath('data.news_and_events', true)
            ->assertJsonPath('data.memory_status', true);

        $this->withVisitorToken($visitor['access_token'])
            ->getJson('/api/v1/visitor/notification-preferences')
            ->assertOk()
            ->assertJsonPath('data.news_and_events', true);

        $this->withVisitorToken($visitor['access_token'])
            ->patchJson('/api/v1/visitor/notification-preferences', ['memory_status' => 'no'])
            ->assertUnprocessable();
        $this->assertTrue((bool) VisitorNotificationPreference::query()->find($account->id)?->memory_status);
    }
}
