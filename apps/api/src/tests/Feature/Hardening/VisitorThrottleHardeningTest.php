<?php

namespace Tests\Feature\Hardening;

use Illuminate\Support\Str;
use Tests\FeatureTestCase;

/** api-028 · límites de visitante (CA-09). */
class VisitorThrottleHardeningTest extends FeatureTestCase
{
    /** CA-09 pre-delivery-hardening */
    public function test_ca09_verify_refresh_and_reset_are_rate_limited(): void
    {
        foreach ([
            ['/api/v1/visitor/auth/email/verify', 10],
            ['/api/v1/visitor/auth/refresh', 30],
            ['/api/v1/visitor/auth/password/reset', 10],
        ] as [$url, $limit]) {
            $ip = '10.28.'.random_int(1, 250).'.'.random_int(1, 250);
            for ($i = 0; $i < $limit; $i++) {
                $this->withServerVariables(['REMOTE_ADDR' => $ip])->postJson($url, [])->assertStatus(422);
            }
            $this->withServerVariables(['REMOTE_ADDR' => $ip])->postJson($url, [])->assertStatus(429);
        }
    }

    /** CA-09 pre-delivery-hardening */
    public function test_ca09_forgot_password_is_also_limited_per_ip(): void
    {
        $ip = '10.29.'.random_int(1, 250).'.'.random_int(1, 250);

        for ($i = 0; $i < 10; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => $ip])
                ->postJson('/api/v1/visitor/auth/password/forgot', ['email' => Str::lower(Str::random(10)).'@test.arca.invalid'])
                ->assertStatus(202);
        }

        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson('/api/v1/visitor/auth/password/forgot', ['email' => Str::lower(Str::random(10)).'@test.arca.invalid'])
            ->assertStatus(429);
    }
}
