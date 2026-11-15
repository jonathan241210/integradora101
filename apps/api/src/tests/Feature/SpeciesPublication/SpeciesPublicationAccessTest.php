<?php

namespace Tests\Feature\SpeciesPublication;

use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\DataProvider;

class SpeciesPublicationAccessTest extends SpeciesPublicationTestCase
{
    /** @return array<string, array{string, string}> every admin route of api-014 (CA-07) */
    public static function adminRoutes(): array
    {
        $routes = [
            ['GET', '/api/v1/admin/species-publication-requests'],
            ['GET', '/api/v1/admin/species-publication-requests/1'],
            ['GET', '/api/v1/admin/species-publication-requests/1/image'],
            ['PATCH', '/api/v1/admin/species-publication-requests/1'],
            ['POST', '/api/v1/admin/species-publication-requests/1/reject'],
            ['POST', '/api/v1/admin/species-publication-requests/1/accept'],
            ['GET', '/api/v1/admin/published-species'],
            ['GET', '/api/v1/admin/species/1/image'],
            ['POST', '/api/v1/admin/species/1/unpublish'],
            ['POST', '/api/v1/admin/species/1/republish'],
            ['GET', '/api/v1/admin/species/1/publication'],
            ['PATCH', '/api/v1/admin/species/1/publication'],
            ['DELETE', '/api/v1/admin/species/1/publication'],
        ];

        $cases = [];
        foreach ($routes as [$method, $uri]) {
            $cases["{$method} {$uri}"] = [$method, $uri];
        }

        return $cases;
    }

    /** CA-07 */
    public function test_ca07_every_declared_route_is_in_the_provider(): void
    {
        $declared = [];
        foreach (Route::getRoutes()->getRoutesByName() as $name => $route) {
            if (str_starts_with($name, 'admin.species-publication-requests.')
                || str_starts_with($name, 'admin.published-species.')
                || str_starts_with($name, 'admin.species.')) {
                $declared[] = $route->methods()[0].' /'.preg_replace('/\{[^}]+\}/', '1', $route->uri());
            }
        }

        $this->assertEqualsCanonicalizing(array_keys(self::adminRoutes()), $declared);
    }

    /** CA-07 */
    #[DataProvider('adminRoutes')]
    public function test_ca07_admin_routes_return_403_without_permission(string $method, string $uri): void
    {
        foreach (['admin', 'executive', 'cashier', 'veterinarian'] as $role) {
            $this->actAs($this->createAccount($role))->json($method, $uri)->assertForbidden();
        }

        $this->actAs($this->createAccount('zoo-admin', false))->json($method, $uri)->assertForbidden();

        $this->app['auth']->forgetGuards();
        $this->json($method, $uri)->assertUnauthorized();
    }

    /** CA-12 */
    public function test_ca12_session_and_role_errors(): void
    {
        $vetRoutes = [['GET', self::VET_SPECIES], ['GET', self::VET_REQUESTS], ['POST', self::VET_REQUESTS]];

        foreach ($vetRoutes as [$method, $uri]) {
            $this->json($method, $uri)->assertUnauthorized();
        }

        $zooAdmin = $this->createAccount('zoo-admin');
        $admin = $this->createAccount('admin');
        foreach ([$zooAdmin, $admin] as $user) {
            foreach ($vetRoutes as [$method, $uri]) {
                $this->actAs($user)->json($method, $uri)->assertForbidden();
            }
        }

        $vet = $this->veterinarian();
        $this->actAs($vet)->getJson(self::VET_SPECIES)->assertOk();
        $this->actAs($vet)->getJson(self::VET_REQUESTS)->assertOk();
    }
}
