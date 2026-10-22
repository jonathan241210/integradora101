<?php

namespace Tests\Concerns;

use App\Mail\VisitorAccessCodeMail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Testing\TestResponse;

trait RegistersVisitors
{
    public function setUp(): void
    {
        parent::setUp();

        Mail::fake();
        Http::fake([
            'api.pwnedpasswords.com/*' => Http::response('', 200),
        ]);
        Cache::flush();
    }

    protected function withVisitorToken(string $token): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }

    protected function visitorPayload(string $email, array $overrides = []): array
    {
        return array_merge([
            'email' => $email,
            'password' => 'secreta12',
            'password_confirmation' => 'secreta12',
            'first_name' => 'Ana',
            'nickname' => 'Anita',
            'avatar_code' => 'jaguar',
            'is_adult' => true,
            'privacy_notice_version' => '2026-10',
        ], $overrides);
    }

    protected function visitorEmail(): string
    {
        return bin2hex(random_bytes(6)).'@test.arca.invalid';
    }

    protected function latestVisitorCode(): string
    {
        $mail = Mail::sent(VisitorAccessCodeMail::class)->last();
        $this->assertNotNull($mail);

        return $mail->code;
    }

    protected function registerVisitor(?string $email = null): string
    {
        $email ??= $this->visitorEmail();
        $this->postJson('/api/v1/visitor/auth/register', $this->visitorPayload($email))->assertCreated();

        return $email;
    }

    /**
     * @return array{email: string, password: string, access_token: string, refresh_token: string}
     */
    protected function verifiedVisitor(?string $email = null): array
    {
        $email = $this->registerVisitor($email);
        $verified = $this->postJson('/api/v1/visitor/auth/email/verify', [
            'email' => $email,
            'code' => $this->latestVisitorCode(),
        ])->assertOk();

        return [
            'email' => $email,
            'password' => 'secreta12',
            'access_token' => $verified->json('data.access_token'),
            'refresh_token' => $verified->json('data.refresh_token'),
        ];
    }

    protected function loginVisitor(string $email, string $password = 'secreta12', string $device = 'pixel'): TestResponse
    {
        return $this->postJson('/api/v1/visitor/auth/login', [
            'email' => $email,
            'password' => $password,
            'device_name' => $device,
        ]);
    }
}
