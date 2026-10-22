<?php

namespace Tests\Feature\Auth;

use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class LoginTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-01 staff-authentication */
    public function test_ca01_staff_authentication_valid_login_creates_a_session(): void
    {
        $user = $this->createStaffUser('executive');
        $session = app('session')->driver();
        $session->start();
        $previousId = $session->getId();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'SafePassphrase12!',
        ]);

        $response->assertOk()->assertJsonPath('two_factor', false);
        $this->assertNotSame($previousId, app('session')->driver()->getId());
        $this->assertAuthenticatedAs($user, 'web');
    }

    /** CA-02 staff-authentication */
    public function test_ca02_staff_authentication_invalid_credentials_are_generic(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'missing@test.arca.invalid',
            'password' => 'IncorrectPassword12!',
        ]);

        $response->assertUnprocessable()
            ->assertJsonPath('message', 'Correo o contraseña incorrectos.')
            ->assertJsonValidationErrors('email');
    }

    /** CA-03 staff-authentication */
    public function test_ca03_staff_authentication_inactive_or_deleted_accounts_cannot_login(): void
    {
        $inactive = $this->createStaffUser('executive', [
            'email' => 'inactive-'.bin2hex(random_bytes(4)).'@test.arca.invalid',
            'is_active' => false,
        ]);
        $deleted = $this->createStaffUser('executive', [
            'email' => 'deleted-'.bin2hex(random_bytes(4)).'@test.arca.invalid',
        ]);
        $deleted->delete();

        foreach ([$inactive, $deleted] as $user) {
            $this->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'SafePassphrase12!',
            ])->assertUnprocessable()
                ->assertJsonPath('message', 'Correo o contraseña incorrectos.');

            $this->assertGuest('web');
        }
    }

    /** CA-04 staff-authentication */
    public function test_ca04_staff_authentication_login_is_limited_to_five_attempts_per_minute(): void
    {
        $payload = [
            'email' => 'missing@test.arca.invalid',
            'password' => 'IncorrectPassword12!',
        ];

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/v1/auth/login', $payload)
                ->assertUnprocessable();
        }

        $this->postJson('/api/v1/auth/login', $payload)
            ->assertTooManyRequests()
            ->assertJsonPath('message', fn (string $message) => str_contains($message, 'Demasiados intentos.'));
    }
}
