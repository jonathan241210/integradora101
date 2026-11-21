<?php

namespace Tests\Feature\Visitor;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class ReadThrottleTest extends VisitorFeatureTestCase
{
    public function test_public_catalog_and_visitor_session_stop_a_burst(): void
    {
        $response = function (Request $request, array $headers) {
            return response()->json(['message' => 'cupo'], 429, $headers);
        };

        RateLimiter::for('public-read', fn () => Limit::perMinute(2)->by('public-read-test')->response($response));
        RateLimiter::for('visitor-session', fn () => Limit::perMinute(2)->by('visitor-session-test')->response($response));

        $this->getJson('/api/v1/species')->assertOk();
        $this->getJson('/api/v1/news')->assertOk();
        $this->getJson('/api/v1/events')->assertStatus(429);

        $visitor = $this->verifiedVisitor();
        $this->withVisitorToken($visitor['access_token'])->getJson('/api/v1/visitor/me')->assertOk();
        $this->withVisitorToken($visitor['access_token'])->getJson('/api/v1/visitor/favorite-species')->assertOk();
        $this->withVisitorToken($visitor['access_token'])->getJson('/api/v1/visitor/notification-preferences')->assertStatus(429);
    }
}
