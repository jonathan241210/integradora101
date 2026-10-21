<?php

namespace Tests\Feature\Visitor;

use App\Models\Visitor;
use App\Models\VisitorRefreshToken;
use App\Models\VisitorVerificationCode;
use Laravel\Sanctum\PersonalAccessToken;

class DeleteAccountTest extends VisitorFeatureTestCase
{
    /** CA-14 */
    public function test_ca14_delete_requires_password_and_removes_rows(): void
    {
        $visitor = $this->verifiedVisitor();
        $account = Visitor::query()->where('email', $visitor['email'])->firstOrFail();

        $this->withVisitorToken($visitor['access_token'])
            ->deleteJson('/api/v1/visitor/me', ['password' => 'mala1234'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'La contraseña no es correcta.');
        $this->assertNotNull($account->fresh());

        $this->withVisitorToken($visitor['access_token'])
            ->deleteJson('/api/v1/visitor/me', ['password' => 'secreta12'])
            ->assertNoContent();

        $this->assertNull(Visitor::query()->find($account->id));
        $this->assertSame(0, VisitorRefreshToken::query()->where('visitor_id', $account->id)->count());
        $this->assertSame(0, VisitorVerificationCode::query()->where('visitor_id', $account->id)->count());
        $this->assertSame(0, PersonalAccessToken::query()->where('tokenable_id', $account->id)->where('tokenable_type', Visitor::class)->count());
        $this->withVisitorToken($visitor['access_token'])->getJson('/api/v1/visitor/me')->assertUnauthorized();
    }
}
