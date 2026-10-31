<?php

namespace Tests\Feature\Admin;

use Illuminate\Routing\Route as LaravelRoute;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

class AdminAccessTest extends AdminFeatureTestCase
{
    /** @return list<array{string, string, string}> */
    private function adminRoutes(): array
    {
        $routes = [];
        foreach (Route::getRoutes() as $route) {
            /** @var LaravelRoute $route */
            $name = (string) $route->getName();
            if (! str_starts_with($name, 'admin.')) {
                continue;
            }
            $method = collect($route->methods())->first(fn ($m) => ! in_array($m, ['HEAD', 'OPTIONS'], true));
            $routes[] = [$name, strtolower($method), '/'.preg_replace('/\{[^}]+\}/', '1', $route->uri())];
        }

        return $routes;
    }

    /** CA-25 */
    public function test_ca25_administration_management_requires_session_and_confirmed_two_factor_on_every_admin_route(): void
    {
        $routes = $this->adminRoutes();
        $this->assertGreaterThanOrEqual(25, count($routes));

        $unconfirmed = $this->createAccount('admin', false);
        $unconfirmedZoo = $this->createAccount('zoo-admin', false);

        foreach ($routes as [$name, $method, $uri]) {
            Auth::forgetGuards();
            $this->app['auth']->shouldUse('web');
            $this->{$method.'Json'}($uri, [])->assertUnauthorized();

            foreach ([$unconfirmed, $unconfirmedZoo] as $user) {
                $this->actAs($user)->{$method.'Json'}($uri, [])
                    ->assertForbidden()
                    ->assertJsonPath('code', 'two_factor_setup_required');
            }
        }
    }
}
