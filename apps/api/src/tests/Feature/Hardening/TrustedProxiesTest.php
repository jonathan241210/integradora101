<?php

namespace Tests\Feature\Hardening;

use App\Providers\AppServiceProvider;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Tests\TestCase;

/** api-028 · proxies de confianza (CA-11). */
class TrustedProxiesTest extends TestCase
{
    protected function tearDown(): void
    {
        TrustProxies::flushState();
        parent::tearDown();
    }

    /** CA-11 pre-delivery-hardening */
    public function test_ca11_ip_is_the_client_ip_when_the_request_comes_through_a_trusted_proxy(): void
    {
        config(['arca.trusted_proxies' => '10.0.0.0/8']);
        (new AppServiceProvider($this->app))->configureTrustedProxies();

        $seen = null;
        $request = Request::create('/x', 'GET', server: ['REMOTE_ADDR' => '10.1.2.3', 'HTTP_X_FORWARDED_FOR' => '203.0.113.9']);
        (new TrustProxies)->handle($request, function (Request $r) use (&$seen) {
            $seen = $r->ip();

            return response('ok');
        });
        $this->assertSame('203.0.113.9', $seen);

        // Un remitente que no es el proxy no puede falsear su IP.
        $direct = Request::create('/x', 'GET', server: ['REMOTE_ADDR' => '198.51.100.7', 'HTTP_X_FORWARDED_FOR' => '203.0.113.9']);
        (new TrustProxies)->handle($direct, function (Request $r) use (&$seen) {
            $seen = $r->ip();

            return response('ok');
        });
        $this->assertSame('198.51.100.7', $seen);
    }
}
