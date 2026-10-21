<?php

namespace Tests\Feature\Visitor;

use App\Mail\VisitorAccessCodeMail;
use App\Models\Visitor;
use App\Models\VisitorVerificationCode;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class RegisterTest extends VisitorFeatureTestCase
{
    /** CA-01 */
    public function test_ca01_register_creates_account_sends_code_and_returns_no_tokens(): void
    {
        $email = $this->visitorEmail();

        $response = $this->postJson('/api/v1/visitor/auth/register', $this->visitorPayload($email, [
            'is_adult' => false,
        ]));
        $response->assertUnprocessable()->assertJsonPath('message', 'Debes ser mayor de 18 años.');

        $created = $this->postJson('/api/v1/visitor/auth/register', $this->visitorPayload($email));

        $created->assertCreated()
            ->assertJsonPath('message', 'Te enviamos un código de 6 dígitos para verificar tu correo.')
            ->assertJsonMissingPath('data.access_token')
            ->assertJsonMissingPath('access_token');

        $visitor = Visitor::query()->where('email', $email)->first();
        $this->assertNotNull($visitor);
        $this->assertNull($visitor->email_verified_at);
        $this->assertNotNull($visitor->adult_confirmed_at);
        $this->assertSame('2026-10', $visitor->privacy_notice_version);
        $this->assertTrue(Hash::check('secreta12', $visitor->password));

        Mail::assertSent(VisitorAccessCodeMail::class);
        $code = $this->latestVisitorCode();
        $stored = VisitorVerificationCode::query()->where('visitor_id', $visitor->id)->first();
        $this->assertNotSame($code, $stored->code_hash);
        $this->assertTrue(Hash::check($code, $stored->code_hash));

        $this->postJson('/api/v1/visitor/auth/register', $this->visitorPayload($email))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Ese correo ya está registrado.');
    }

    /** CA-18 */
    public function test_ca18_register_is_limited_per_ip(): void
    {
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/visitor/auth/register', $this->visitorPayload($this->visitorEmail()))
                ->assertCreated();
        }

        $this->postJson('/api/v1/visitor/auth/register', $this->visitorPayload($this->visitorEmail()))
            ->assertStatus(429)
            ->assertSee('Espera', false)
            ->assertSee('segundos', false);
    }
}
