<?php

namespace Tests\Feature\Visitor;

class LoginTest extends VisitorFeatureTestCase
{
    /** CA-04 */
    public function test_ca04_login_tokens_unverified_invalid_and_throttle(): void
    {
        $verified = $this->verifiedVisitor();
        $this->loginVisitor($verified['email'])
            ->assertOk()
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonPath('data.visitor.email', $verified['email']);

        $pending = $this->registerVisitor();
        $this->loginVisitor($pending)
            ->assertForbidden()
            ->assertJsonPath('code', 'email_not_verified');

        $this->loginVisitor($verified['email'], 'otra1234')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Correo o contraseña incorrectos.');

        $this->loginVisitor('ausente@test.arca.invalid')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Correo o contraseña incorrectos.');

        $limited = $this->verifiedVisitor();
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->loginVisitor($limited['email'], 'mala1234')->assertUnprocessable();
        }
        $this->loginVisitor($limited['email'], 'mala1234')
            ->assertStatus(429)
            ->assertSee('Espera', false);
    }
}
