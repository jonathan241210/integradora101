<?php

namespace Tests\Feature\Visitor;

use App\Models\Visitor;
use App\Models\VisitorRefreshToken;
use Illuminate\Support\Facades\Cache;

class RefreshTest extends VisitorFeatureTestCase
{
    /** CA-06 */
    public function test_ca06_refresh_rotates_and_reuse_revokes_family(): void
    {
        $visitor = $this->verifiedVisitor();
        $rotated = $this->postJson('/api/v1/visitor/auth/refresh', [
            'refresh_token' => $visitor['refresh_token'],
        ])->assertOk();

        $old = $visitor['refresh_token'];
        Cache::forget('visitor-refresh-rotated:'.hash('sha256', $old));

        $this->postJson('/api/v1/visitor/auth/refresh', [
            'refresh_token' => $old,
        ])->assertUnauthorized()
            ->assertJsonPath('message', 'La sesión ya no es válida. Vuelve a entrar.');

        $this->withVisitorToken($rotated->json('data.access_token'))
            ->getJson('/api/v1/visitor/me')
            ->assertUnauthorized();

        $accountId = Visitor::query()->where('email', $visitor['email'])->value('id');
        $this->assertSame(
            0,
            VisitorRefreshToken::query()
                ->where('visitor_id', $accountId)
                ->whereNull('revoked_at')
                ->whereNull('replaced_by_id')
                ->count(),
        );
    }

    /** CA-07 */
    public function test_ca07_concurrent_refresh_keeps_a_single_pair(): void
    {
        $visitor = $this->verifiedVisitor();
        $first = $this->postJson('/api/v1/visitor/auth/refresh', [
            'refresh_token' => $visitor['refresh_token'],
        ])->assertOk();

        $this->postJson('/api/v1/visitor/auth/refresh', [
            'refresh_token' => $visitor['refresh_token'],
        ])->assertUnauthorized();

        $this->withVisitorToken($first->json('data.access_token'))
            ->getJson('/api/v1/visitor/me')
            ->assertOk();

        $accountId = Visitor::query()->where('email', $visitor['email'])->value('id');
        $this->assertSame(
            1,
            VisitorRefreshToken::query()
                ->where('visitor_id', $accountId)
                ->whereNull('revoked_at')
                ->whereNull('replaced_by_id')
                ->count(),
        );
    }
}
