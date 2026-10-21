<?php

namespace Tests\Feature\Visitor;

use App\Models\VisitorRefreshToken;
use Laravel\Sanctum\PersonalAccessToken;

class TokenTest extends VisitorFeatureTestCase
{
    /** CA-05 */
    public function test_ca05_access_token_ability_and_refresh_hash(): void
    {
        $visitor = $this->verifiedVisitor();
        $login = $this->loginVisitor($visitor['email'])->assertOk();
        $access = $login->json('data.access_token');
        $refresh = $login->json('data.refresh_token');

        [$id] = explode('|', $access, 2);
        $token = PersonalAccessToken::query()->find($id);

        $this->assertNotNull($token);
        $this->assertTrue($token->can('visitor'));
        $this->assertTrue($token->expires_at->greaterThan(now()->addMinutes(14)));
        $this->assertTrue($token->expires_at->lessThan(now()->addMinutes(16)));
        $this->assertSame(128, strlen($refresh));

        $row = VisitorRefreshToken::query()->where('token_hash', hash('sha256', $refresh))->first();
        $this->assertNotNull($row);
        $this->assertNotSame($refresh, $row->token_hash);
        $this->assertSame('pixel', $row->device_name);
        $this->assertTrue($row->expires_at->greaterThan(now()->addDays(29)));
        $this->assertTrue($row->expires_at->lessThan(now()->addDays(31)));
        $this->assertDatabaseMissing('visitor_refresh_tokens', ['token_hash' => $refresh]);
    }
}
