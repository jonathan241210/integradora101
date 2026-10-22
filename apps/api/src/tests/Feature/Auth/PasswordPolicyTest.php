<?php

namespace Tests\Feature\Auth;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Tests\FeatureTestCase;

class PasswordPolicyTest extends FeatureTestCase
{
    /** CA-11 staff-authentication */
    public function test_ca11_staff_authentication_password_policy_enforces_strength_and_hibp_check(): void
    {
        $isCompromised = false;
        $suffix = substr(strtoupper(sha1('SafePassphrase12!')), 5);
        Http::fake(function () use (&$isCompromised, $suffix) {
            return Http::response($isCompromised ? $suffix.':1' : '', 200);
        });

        $valid = Validator::make(
            ['password' => 'SafePassphrase12!'],
            ['password' => [Password::defaults()]],
        );
        $weak = Validator::make(
            ['password' => 'short'],
            ['password' => [Password::defaults()]],
        );

        $this->assertTrue($valid->passes());
        $this->assertFalse($weak->passes());
        Http::assertSent(fn ($request) => str_contains($request->url(), 'api.pwnedpasswords.com/range/'));

        $isCompromised = true;

        $compromisedPassword = Validator::make(
            ['password' => 'SafePassphrase12!'],
            ['password' => [Password::defaults()]],
        );

        $this->assertFalse($compromisedPassword->passes());
    }

    /** CA-11 staff-authentication */
    public function test_ca11_staff_authentication_only_local_environment_skips_hibp(): void
    {
        $this->app['env'] = 'local';
        Http::fake();

        $validator = Validator::make(
            ['password' => 'SafePassphrase12!'],
            ['password' => [Password::defaults()]],
        );

        $this->assertTrue($validator->passes());
        Http::assertNothingSent();
    }
}
