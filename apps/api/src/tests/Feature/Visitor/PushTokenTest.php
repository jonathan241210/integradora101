<?php

namespace Tests\Feature\Visitor;

use App\Actions\Admin\Content\SaveNewsAction;
use App\Models\User;
use App\Models\Visitor;
use App\Models\VisitorPushToken;
use Illuminate\Support\Facades\Auth;

class PushTokenTest extends PushFeatureTestCase
{
    /** CA-01 */
    public function test_ca01_registering_the_same_android_token_keeps_one_row(): void
    {
        $visitor = $this->verifiedVisitor();
        $this->registerPhone($visitor, 'ExponentPushToken[same]');
        $this->registerPhone($visitor, 'ExponentPushToken[same]');

        $account = $this->visitorModel($visitor);
        $this->assertSame(1, VisitorPushToken::query()->where('token', 'ExponentPushToken[same]')->count());
        $this->assertSame(
            (int) $account->id,
            (int) VisitorPushToken::query()->where('token', 'ExponentPushToken[same]')->value('visitor_id'),
        );

        $me = $this->withVisitorToken($visitor['access_token'])->getJson('/api/v1/visitor/me')->assertOk()->json('data');
        $this->assertArrayNotHasKey('token', $me);
        $this->assertArrayNotHasKey('news_and_events', $me);
    }

    /** CA-02 */
    public function test_ca02_rejects_missing_session_unverified_email_and_bad_platform(): void
    {
        $this->putJson('/api/v1/visitor/push-tokens', [
            'token' => 'ExponentPushToken[x]',
            'platform' => 'android',
        ])->assertUnauthorized();

        $email = $this->registerVisitor();
        $unverified = Visitor::query()->where('email', $email)->firstOrFail();
        $token = $unverified->createToken('phone', ['visitor'])->plainTextToken;
        $this->withVisitorToken($token)
            ->putJson('/api/v1/visitor/push-tokens', [
                'token' => 'ExponentPushToken[x]',
                'platform' => 'android',
            ])
            ->assertForbidden()
            ->assertJsonPath('code', 'email_not_verified');

        $visitor = $this->verifiedVisitor();
        $this->withVisitorToken($visitor['access_token'])
            ->putJson('/api/v1/visitor/push-tokens', [
                'token' => 'ExponentPushToken[x]',
                'platform' => 'ios',
            ])
            ->assertUnprocessable();
        $this->withVisitorToken($visitor['access_token'])
            ->putJson('/api/v1/visitor/push-tokens', ['platform' => 'android'])
            ->assertUnprocessable();

        $this->assertSame(0, VisitorPushToken::query()->count());
    }

    /** CA-03 */
    public function test_ca03_delete_removes_only_the_owners_token(): void
    {
        $owner = $this->verifiedVisitor();
        $other = $this->verifiedVisitor();
        $this->registerPhone($owner, 'ExponentPushToken[owner]');
        $this->registerPhone($other, 'ExponentPushToken[other]');

        $this->withVisitorToken($owner['access_token'])
            ->deleteJson('/api/v1/visitor/push-tokens', ['token' => 'ExponentPushToken[other]'])
            ->assertNotFound();
        $this->assertNotNull(VisitorPushToken::query()->where('token', 'ExponentPushToken[other]')->first());

        $this->withVisitorToken($owner['access_token'])
            ->deleteJson('/api/v1/visitor/push-tokens', ['token' => 'ExponentPushToken[owner]'])
            ->assertNoContent();
        $this->assertNull(VisitorPushToken::query()->where('token', 'ExponentPushToken[owner]')->first());
    }

    /** CA-12 */
    public function test_ca12_two_phones_stay_independent_when_one_is_removed(): void
    {
        $visitor = $this->verifiedVisitor();
        $this->registerPhone($visitor, 'ExponentPushToken[a]');
        $this->registerPhone($visitor, 'ExponentPushToken[b]');
        $this->setNewsPreference($visitor, true);

        $this->saveVisibleNews();
        $this->assertCount(2, $this->push->messages);

        $this->withVisitorToken($visitor['access_token'])
            ->deleteJson('/api/v1/visitor/push-tokens', ['token' => 'ExponentPushToken[a]'])
            ->assertNoContent();

        $this->assertNotNull(VisitorPushToken::query()->where('token', 'ExponentPushToken[b]')->first());
        $this->assertNull(VisitorPushToken::query()->where('token', 'ExponentPushToken[a]')->first());
    }

    /** CA-13 */
    public function test_ca13_deleting_the_account_removes_tokens_and_preferences(): void
    {
        $visitor = $this->verifiedVisitor();
        $account = $this->visitorModel($visitor);
        $this->registerPhone($visitor);
        $this->setNewsPreference($visitor, true);

        $this->withVisitorToken($visitor['access_token'])
            ->deleteJson('/api/v1/visitor/me', ['password' => 'secreta12'])
            ->assertNoContent();

        $this->assertSame(0, VisitorPushToken::query()->where('visitor_id', $account->id)->count());
        $this->assertNull($this->preferenceRow($account));
    }

    /** CA-15 */
    public function test_ca15_staff_session_cannot_use_visitor_push_routes(): void
    {
        $this->getJson('/api/v1/visitor/notification-preferences')->assertUnauthorized();

        $staff = $this->createAccount('admin');
        Auth::forgetGuards();
        $this->actingAs($staff, 'web')
            ->putJson('/api/v1/visitor/push-tokens', [
                'token' => 'ExponentPushToken[staff]',
                'platform' => 'android',
            ])
            ->assertForbidden();

        $this->assertSame(0, VisitorPushToken::query()->where('token', 'ExponentPushToken[staff]')->count());
        $this->assertInstanceOf(User::class, $staff);
    }

    private function saveVisibleNews(): void
    {
        $admin = $this->createAccount('admin');
        $today = now('America/Mexico_City')->toDateString();
        app(SaveNewsAction::class)->execute($admin, null, [
            'title' => 'Aviso de prueba',
            'description' => 'Resumen',
            'content' => 'Contenido',
            'category' => 'Aviso',
            'published_date' => $today,
            'start_date' => $today,
        ]);
    }
}
