<?php

namespace Tests\Feature\Visitor;

class ProfileTest extends VisitorFeatureTestCase
{
    /** CA-12 */
    public function test_ca12_profile_show_and_update_validates_avatar(): void
    {
        $visitor = $this->verifiedVisitor();

        $this->withVisitorToken($visitor['access_token'])
            ->getJson('/api/v1/visitor/me')
            ->assertOk()
            ->assertJsonPath('data.email', $visitor['email'])
            ->assertJsonPath('data.first_name', 'Ana')
            ->assertJsonPath('data.nickname', 'Anita')
            ->assertJsonPath('data.avatar_code', 'jaguar');

        $this->withVisitorToken($visitor['access_token'])
            ->patchJson('/api/v1/visitor/me', [
                'first_name' => 'Ana Lucía',
                'nickname' => 'Lucha',
                'avatar_code' => 'no-existe',
            ])->assertUnprocessable()->assertJsonPath('message', 'Elige un avatar del catálogo.');

        $this->withVisitorToken($visitor['access_token'])
            ->patchJson('/api/v1/visitor/me', [
                'first_name' => 'Ana Lucía',
                'nickname' => 'Lucha',
                'avatar_code' => 'lion',
            ])->assertOk()
            ->assertJsonPath('data.first_name', 'Ana Lucía')
            ->assertJsonPath('data.nickname', 'Lucha')
            ->assertJsonPath('data.avatar_code', 'lion')
            ->assertJsonPath('data.email', $visitor['email']);
    }

    /** CA-13 */
    public function test_ca13_password_change_keeps_current_session(): void
    {
        $visitor = $this->verifiedVisitor();
        $first = $this->loginVisitor($visitor['email'], 'secreta12', 'telefono-a')->assertOk();
        $second = $this->loginVisitor($visitor['email'], 'secreta12', 'telefono-b')->assertOk();

        $this->withVisitorToken($second->json('data.access_token'))
            ->putJson('/api/v1/visitor/me/password', [
                'current_password' => 'mala1234',
                'password' => 'nueva1234',
                'password_confirmation' => 'nueva1234',
            ])->assertUnprocessable()->assertJsonPath('message', 'La contraseña no es correcta.');

        $this->withVisitorToken($second->json('data.access_token'))
            ->putJson('/api/v1/visitor/me/password', [
                'current_password' => 'secreta12',
                'password' => 'nueva1234',
                'password_confirmation' => 'nueva1234',
            ])->assertOk()->assertJsonPath('message', 'Contraseña actualizada.');

        $this->withVisitorToken($first->json('data.access_token'))
            ->getJson('/api/v1/visitor/me')
            ->assertUnauthorized();
        $this->withVisitorToken($second->json('data.access_token'))
            ->getJson('/api/v1/visitor/me')
            ->assertOk();
    }
}
