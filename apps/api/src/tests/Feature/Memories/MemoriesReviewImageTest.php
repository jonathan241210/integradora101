<?php

namespace Tests\Feature\Memories;

use Illuminate\Support\Facades\Auth;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\FeatureTestCase;

class MemoriesReviewImageTest extends FeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;

    /** CA-08 */
    public function test_ca08_image_route_serves_binary_only_with_permission(): void
    {
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);

        foreach (['admin', 'executive', 'cashier', 'veterinarian'] as $role) {
            Auth::forgetGuards();
            $this->actingAs($this->createMemoryStaff($role), 'web')
                ->getJson("/api/v1/admin/memories/{$memory->id}/image")->assertForbidden();
        }

        Auth::forgetGuards();
        $response = $this->actingAs($this->createMemoryStaff(), 'web')->get("/api/v1/admin/memories/{$memory->id}/image");

        $response->assertOk();
        $this->assertSame('image/jpeg', $response->headers->get('Content-Type'));
        $this->assertSame($disk->get($memory->image_path), $response->getContent());
        $this->assertSame('submitted', $memory->fresh()->status);
    }

    /** CA-08 */
    public function test_ca08_image_route_404_when_file_or_path_is_missing(): void
    {
        $disk = $this->fakeMemoryDisk();
        $user = $this->createMemoryStaff();
        $this->actingAs($user, 'web');

        $noFile = $this->createMemory();
        $this->getJson("/api/v1/admin/memories/{$noFile->id}/image")
            ->assertNotFound()->assertJsonPath('message', 'La imagen ya no está disponible.');

        $noPath = $this->createMemory(['image_path' => null], 'rejected');
        $this->getJson("/api/v1/admin/memories/{$noPath->id}/image")
            ->assertNotFound()->assertJsonPath('message', 'La imagen ya no está disponible.');

        $this->getJson('/api/v1/admin/memories/999999999/image')
            ->assertNotFound()->assertJsonPath('message', 'Petición no encontrada.');
        $this->assertFalse($disk->exists('memories'));
    }

    /** CA-08 api013_ca10 */
    public function test_api013_ca10_review_image_is_binary_without_url_and_403_without_permission(): void
    {
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);

        $this->actingAs($this->createMemoryStaff('admin'), 'web')
            ->get("/api/v1/admin/memories/{$memory->id}/image")->assertForbidden();

        Auth::forgetGuards();
        $user = $this->createMemoryStaff();
        $response = $this->actingAs($user, 'web')->get("/api/v1/admin/memories/{$memory->id}/image");

        $this->assertStringStartsWith('image/', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertStringNotContainsString('http', $response->getContent());
        $this->assertStringNotContainsString($memory->image_path, $response->getContent());

        $detail = $this->getJson("/api/v1/admin/memories/{$memory->id}")->assertOk();
        $this->assertStringNotContainsString('image_url', $detail->getContent());
        $this->assertStringNotContainsString($memory->image_path, $detail->getContent());
    }
}
