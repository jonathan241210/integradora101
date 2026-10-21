<?php

namespace Tests\Feature\Visitor;

use Illuminate\Support\Facades\Mail;

class PasswordResetTest extends VisitorFeatureTestCase
{
    /** CA-10 */
    public function test_ca10_forgot_password_is_generic_and_limited(): void
    {
        $this->postJson('/api/v1/visitor/auth/password/forgot', [
            'email' => 'nadie@test.arca.invalid',
        ])->assertStatus(202)
            ->assertJsonPath('message', 'Si el correo está registrado, enviamos un código de 6 dígitos.');
        Mail::assertNothingSent();

        $visitor = $this->verifiedVisitor();
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $this->postJson('/api/v1/visitor/auth/password/forgot', [
                'email' => $visitor['email'],
            ])->assertStatus(202);
        }

        $this->postJson('/api/v1/visitor/auth/password/forgot', [
            'email' => $visitor['email'],
        ])->assertStatus(429)->assertSee('Espera', false);
    }

    /** CA-11 */
    public function test_ca11_reset_changes_password_and_revokes_all_tokens(): void
    {
        $visitor = $this->verifiedVisitor();
        $this->postJson('/api/v1/visitor/auth/password/forgot', [
            'email' => $visitor['email'],
        ])->assertStatus(202);

        $this->postJson('/api/v1/visitor/auth/password/reset', [
            'email' => $visitor['email'],
            'code' => '000000',
            'password' => 'nueva1234',
            'password_confirmation' => 'nueva1234',
        ])->assertUnprocessable()->assertJsonPath('message', 'El código no es válido.');

        $this->postJson('/api/v1/visitor/auth/password/reset', [
            'email' => $visitor['email'],
            'code' => $this->latestVisitorCode(),
            'password' => 'nueva1234',
            'password_confirmation' => 'nueva1234',
        ])->assertOk()->assertJsonPath('message', 'Contraseña actualizada. Vuelve a entrar.');

        $this->withVisitorToken($visitor['access_token'])->getJson('/api/v1/visitor/me')->assertUnauthorized();
        $this->loginVisitor($visitor['email'])->assertUnprocessable();
        $this->loginVisitor($visitor['email'], 'nueva1234')->assertOk();
    }
}
