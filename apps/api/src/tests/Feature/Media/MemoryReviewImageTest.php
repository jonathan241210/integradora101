<?php

namespace Tests\Feature\Media;

use Illuminate\Support\Facades\Auth;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\FeatureTestCase;

/**
 * api-013: imagen de revisión de momentos (CA-10). Implementado en api-010.
 */
class MemoryReviewImageTest extends FeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;

    /** CA-10 */
    public function test_ca10_review_image_is_binary_and_detail_has_no_url(): void
    {
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);
        $this->actingAs($this->createMemoryStaff(), 'web');

        $response = $this->get("/api/v1/admin/memories/{$memory->id}/image")->assertOk();

        $this->assertSame('image/jpeg', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertSame($disk->get($memory->image_path), $response->getContent());

        $detail = $this->getJson("/api/v1/admin/memories/{$memory->id}")->assertOk()->getContent();
        $this->assertStringNotContainsString('image_url', $detail);
        $this->assertStringNotContainsString($memory->image_path, $detail);
    }

    /** CA-10 */
    public function test_ca10_review_image_returns_403_without_permission_and_no_body(): void
    {
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);

        foreach (['admin', 'executive', 'cashier', 'veterinarian'] as $role) {
            Auth::forgetGuards();
            $response = $this->actingAs($this->createMemoryStaff($role), 'web')
                ->get("/api/v1/admin/memories/{$memory->id}/image")->assertForbidden();
            $this->assertStringNotContainsString($disk->get($memory->image_path), $response->getContent());
        }
    }

    /** CA-10 */
    public function test_ca10_review_image_missing_file_returns_404_in_spanish(): void
    {
        $this->fakeMemoryDisk();
        $this->actingAs($this->createMemoryStaff(), 'web');
        $noFile = $this->createMemory();

        $this->getJson("/api/v1/admin/memories/{$noFile->id}/image")
            ->assertNotFound()->assertJsonPath('message', 'La imagen ya no está disponible.');
        $this->getJson('/api/v1/admin/memories/999999999/image')
            ->assertNotFound()->assertJsonPath('message', 'Petición no encontrada.');
    }
}
