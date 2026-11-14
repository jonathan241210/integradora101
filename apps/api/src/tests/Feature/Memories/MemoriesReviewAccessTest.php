<?php

namespace Tests\Feature\Memories;

use Illuminate\Support\Facades\Auth;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\Concerns\RegistersVisitors;
use Tests\FeatureTestCase;

class MemoriesReviewAccessTest extends FeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;
    use RegistersVisitors;

    /** @return array<string, array{string, string}> las 5 rutas de revisión. */
    private function routes(): array
    {
        $body = ['rejection_reason' => 'x', 'rejected_fields' => ['image']];

        return [
            'index' => ['getJson', '/api/v1/admin/memories', []],
            'show' => ['getJson', '/api/v1/admin/memories/1', []],
            'image' => ['getJson', '/api/v1/admin/memories/1/image', []],
            'accept' => ['postJson', '/api/v1/admin/memories/1/accept', []],
            'reject' => ['postJson', '/api/v1/admin/memories/1/reject', $body],
        ];
    }

    /** CA-14 */
    public function test_ca14_admin_role_gets_403_on_memory_routes(): void
    {
        $memory = $this->createMemory();

        foreach (['admin', 'executive', 'cashier', 'veterinarian'] as $role) {
            $user = $this->createMemoryStaff($role);
            foreach ($this->routes() as $name => [$method, $uri, $body]) {
                $uri = str_replace('/1', '/'.$memory->id, $uri);
                Auth::forgetGuards();
                $this->actingAs($user, 'web')->{$method}($uri, $body)
                    ->assertForbidden();
            }
        }

        $this->assertSame('submitted', $memory->fresh()->status);
    }

    /** CA-14 */
    public function test_ca14_zoo_admin_without_two_factor_is_blocked(): void
    {
        $user = $this->createMemoryStaff('zoo-admin', false);

        $this->actingAs($user, 'web')->getJson('/api/v1/admin/memories')
            ->assertForbidden()
            ->assertJsonPath('code', 'two_factor_setup_required');
    }

    /** CA-14 */
    public function test_ca14_zoo_admin_with_permission_and_two_factor_is_allowed(): void
    {
        $user = $this->createMemoryStaff('zoo-admin');

        $this->actingAs($user, 'web')->getJson('/api/v1/admin/memories')->assertOk();
    }

    /** CA-15 */
    public function test_ca15_visitor_session_cannot_read_staff_memory_routes(): void
    {
        $memory = $this->createMemory();
        $visitor = $this->verifiedVisitor();

        foreach ($this->routes() as [$method, $uri, $body]) {
            $uri = str_replace('/1', '/'.$memory->id, $uri);
            $response = $this->withVisitorToken($visitor['access_token'])->{$method}($uri, $body);
            $this->assertContains($response->getStatusCode(), [401, 403]);
            $this->assertStringNotContainsString($memory->opinion, $response->getContent());
        }

        $this->assertSame('submitted', $memory->fresh()->status);
    }
}
