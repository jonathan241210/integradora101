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
            ->assertCreated()
            ->assertJsonPath('message', 'Te enviamos un código de 6 dígitos para verificar tu correo.');
        $this->assertSame(1, Visitor::query()->where('email', $email)->count());
        Mail::assertSentCount(2);
    }

    /** RN-04 */
    public function test_rn04_duplicate_register_sends_notice_without_changing_the_account(): void
    {
        $email = $this->registerVisitor();
        $verificationCode = $this->latestVisitorCode();

        $this->postJson('/api/v1/visitor/auth/register', $this->visitorPayload($email, [
            'password' => 'otraClave1',
            'password_confirmation' => 'otraClave1',
            'first_name' => 'Bruno',
            'nickname' => 'Bruno',
            'avatar_code' => 'wolf',
        ]))->assertCreated()
            ->assertJsonPath('message', 'Te enviamos un código de 6 dígitos para verificar tu correo.')
            ->assertJsonMissingPath('access_token');

        $visitor = Visitor::query()->where('email', $email)->firstOrFail();
        $this->assertSame(1, Visitor::query()->where('email', $email)->count());
        $this->assertSame('Ana', $visitor->first_name);
        $this->assertSame('Anita', $visitor->nickname);
        $this->assertSame('jaguar', $visitor->avatar_code);
        $this->assertNull($visitor->email_verified_at);
        $this->assertTrue(Hash::check('secreta12', $visitor->password));
        $this->assertFalse(Hash::check('otraClave1', $visitor->password));

        $mails = Mail::sent(VisitorAccessCodeMail::class);
        $this->assertCount(2, $mails);
        $this->assertSame('email_verification', $mails->first()->purpose);
        $this->assertSame('registration_notice', $mails->last()->purpose);
        $this->assertSame('Alguien intentó registrar tu correo', $mails->last()->envelope()->subject);
        $this->assertStringContainsString('Alguien intentó crear una cuenta con este correo.', $mails->last()->render());

        $this->postJson('/api/v1/visitor/auth/email/verify', [
            'email' => $email,
            'code' => '000000',
        ])->assertUnprocessable()->assertJsonPath('message', 'El código no es válido.');

        $notice = VisitorVerificationCode::query()->where('visitor_id', $visitor->id)->where('purpose', 'registration_notice')->firstOrFail();
        $verification = VisitorVerificationCode::query()->where('visitor_id', $visitor->id)->where('purpose', 'email_verification')->firstOrFail();
        $this->assertSame(1, $notice->fresh()->attempts);
        $this->assertSame(0, $verification->fresh()->attempts);

        $this->travel(61)->seconds();
        $this->postJson('/api/v1/visitor/auth/email/resend', ['email' => $email])->assertStatus(202);
        $resent = $this->latestVisitorCode();
        $this->assertSame('registration_notice', Mail::sent(VisitorAccessCodeMail::class)->last()->purpose);
        $this->assertNotSame($verificationCode, $resent);

        $this->postJson('/api/v1/visitor/auth/email/verify', [
            'email' => $email,
            'code' => $resent,
        ])->assertOk()
            ->assertJsonPath('message', 'Ese correo ya está registrado.')
            ->assertJsonPath('code', 'email_already_registered')
            ->assertJsonMissingPath('data.access_token')
            ->assertJsonMissingPath('access_token');

        $visitor->refresh();
        $this->assertNull($visitor->email_verified_at);
        $this->assertTrue(Hash::check('secreta12', $visitor->password));

        $this->postJson('/api/v1/visitor/auth/email/verify', [
            'email' => $email,
            'code' => $verificationCode,
        ])->assertOk()->assertJsonPath('data.token_type', 'Bearer');
    }

    /** RN-04 */
    public function test_rn04_verified_duplicate_keeps_the_password_and_does_not_open_a_session(): void
    {
        $account = $this->verifiedVisitor();

        $this->postJson('/api/v1/visitor/auth/register', $this->visitorPayload($account['email'], [
            'password' => 'otraClave1',
            'password_confirmation' => 'otraClave1',
        ]))->assertCreated()
            ->assertJsonPath('message', 'Te enviamos un código de 6 dígitos para verificar tu correo.');

        $visitor = Visitor::query()->where('email', $account['email'])->firstOrFail();
        $this->assertSame(1, Visitor::query()->where('email', $account['email'])->count());
        $this->assertNotNull($visitor->email_verified_at);
        $this->assertTrue(Hash::check('secreta12', $visitor->password));
        $this->assertSame('registration_notice', Mail::sent(VisitorAccessCodeMail::class)->last()->purpose);

        $this->postJson('/api/v1/visitor/auth/email/verify', [
            'email' => $account['email'],
            'code' => $this->latestVisitorCode(),
        ])->assertOk()
            ->assertJsonPath('code', 'email_already_registered')
            ->assertJsonMissingPath('data.access_token');

        $this->loginVisitor($account['email'])->assertOk();
        $this->loginVisitor($account['email'], 'otraClave1')->assertUnprocessable()
            ->assertJsonPath('message', 'Correo o contraseña incorrectos.');
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
