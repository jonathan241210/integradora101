<?php

namespace Tests\Feature\Visitor;

use App\Models\VisitorVerificationCode;
use Illuminate\Support\Facades\Mail;

class VerifyEmailTest extends VisitorFeatureTestCase
{
    /** CA-02 */
    public function test_ca02_verify_issues_tokens_and_rejects_bad_codes(): void
    {
        $email = $this->registerVisitor();
        $code = $this->latestVisitorCode();

        $this->postJson('/api/v1/visitor/auth/email/verify', [
            'email' => $email,
            'code' => '000000',
        ])->assertUnprocessable()->assertJsonPath('message', 'El código no es válido.');

        $verified = $this->postJson('/api/v1/visitor/auth/email/verify', [
            'email' => $email,
            'code' => $code,
        ])->assertOk();

        $verified->assertJsonPath('data.token_type', 'Bearer');
        $this->assertNotEmpty($verified->json('data.access_token'));
        $this->assertNotEmpty($verified->json('data.refresh_token'));
        $this->assertNotNull(VisitorVerificationCode::query()->where('code_hash', '!=', '')->whereNotNull('consumed_at')->first());

        $this->postJson('/api/v1/visitor/auth/email/verify', [
            'email' => $email,
            'code' => $code,
        ])->assertUnprocessable()->assertJsonPath('message', 'El código no es válido.');

        $expiredEmail = $this->registerVisitor();
        $expiredCode = $this->latestVisitorCode();
        $this->travel(16)->minutes();
        $this->postJson('/api/v1/visitor/auth/email/verify', [
            'email' => $expiredEmail,
            'code' => $expiredCode,
        ])->assertUnprocessable();

        $this->travelBack();
        $limitedEmail = $this->registerVisitor();
        $limitedCode = $this->latestVisitorCode();
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/visitor/auth/email/verify', [
                'email' => $limitedEmail,
                'code' => '111111',
            ])->assertUnprocessable();
        }
        $this->postJson('/api/v1/visitor/auth/email/verify', [
            'email' => $limitedEmail,
            'code' => $limitedCode,
        ])->assertUnprocessable()->assertJsonPath('message', 'El código no es válido.');
    }

    /** CA-03 */
    public function test_ca03_resend_is_generic_and_rate_limited(): void
    {
        $this->postJson('/api/v1/visitor/auth/email/resend', [
            'email' => 'nadie@test.arca.invalid',
        ])->assertStatus(202)->assertJsonPath('message', 'Si el correo está registrado, enviamos un código de 6 dígitos.');
        Mail::assertNothingSent();

        $email = $this->registerVisitor();
        $this->postJson('/api/v1/visitor/auth/email/resend', ['email' => $email])->assertStatus(202);
        $this->postJson('/api/v1/visitor/auth/email/resend', ['email' => $email])
            ->assertStatus(429)
            ->assertSee('Espera', false);

        for ($attempt = 0; $attempt < 4; $attempt++) {
            $this->travel(61)->seconds();
            $this->postJson('/api/v1/visitor/auth/email/resend', ['email' => $email])->assertStatus(202);
        }

        $this->travel(61)->seconds();
        $this->postJson('/api/v1/visitor/auth/email/resend', ['email' => $email])->assertStatus(429);
    }
}
