<?php

namespace Tests\Feature\Visitor;

use App\Models\Visitor;
use App\Models\VisitorVerificationCode;
use Illuminate\Support\Facades\Hash;

class VerificationCodeTest extends VisitorFeatureTestCase
{
    /** CA-16 */
    public function test_ca16_codes_are_hashed_single_use_and_expire(): void
    {
        $email = $this->registerVisitor();
        $code = $this->latestVisitorCode();
        $visitor = Visitor::query()->where('email', $email)->firstOrFail();
        $row = VisitorVerificationCode::query()->where('visitor_id', $visitor->id)->firstOrFail();

        $this->assertSame('email_verification', $row->purpose);
        $this->assertSame(0, $row->attempts);
        $this->assertNull($row->consumed_at);
        $this->assertNotSame($code, $row->code_hash);
        $this->assertTrue(Hash::check($code, $row->code_hash));
        $this->assertTrue($row->expires_at->greaterThan(now()->addMinutes(14)));
        $this->assertTrue($row->expires_at->lessThan(now()->addMinutes(16)));
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);

        $this->postJson('/api/v1/visitor/auth/email/verify', [
            'email' => $email,
            'code' => $code,
        ])->assertOk();
        $this->assertNotNull($row->fresh()->consumed_at);

        $this->postJson('/api/v1/visitor/auth/email/verify', [
            'email' => $email,
            'code' => $code,
        ])->assertUnprocessable();
    }
}
