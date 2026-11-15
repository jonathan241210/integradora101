<?php

namespace Tests\Feature\Memories;

use App\Models\VisitorMemory;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\FeatureTestCase;

class MemoriesReviewListTest extends FeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;

    /** CA-07 */
    public function test_ca07_review_list_paginates_and_filters_by_status(): void
    {
        $user = $this->createMemoryStaff();
        // Fixtures propios con created_at lejano para ordenar por encima de datos existentes (R16).
        $old = $this->createMemory(['created_at' => '2090-01-01 10:00:00'], 'rejected');
        $mid = $this->createMemory(['created_at' => '2090-01-02 10:00:00'], 'submitted');
        $new = $this->createMemory(['created_at' => '2090-01-03 10:00:00'], 'accepted');

        $response = $this->actingAs($user, 'web')->getJson('/api/v1/admin/memories?limit=2')->assertOk()
            ->assertJsonPath('meta.page', 1)
            ->assertJsonPath('meta.limit', 2)
            ->assertJsonPath('meta.has_more', true);
        $this->assertSame([$new->id, $mid->id], collect($response->json('data'))->pluck('id')->all());
        $this->assertSame(['id', 'status', 'opinion', 'created_at', 'resubmitted_count'], array_keys($response->json('data.0')));

        $page2 = $this->getJson('/api/v1/admin/memories?limit=2&page=2')->assertOk();
        $this->assertSame($old->id, $page2->json('data.0.id'));

        $default = $this->getJson('/api/v1/admin/memories')->assertOk();
        $this->assertSame(10, $default->json('meta.limit'));

        $filtered = $this->getJson('/api/v1/admin/memories?status=rejected&limit=50')->assertOk();
        $this->assertContains($old->id, collect($filtered->json('data'))->pluck('id')->all());
        $this->assertSame([], collect($filtered->json('data'))->pluck('status')->reject(fn ($s) => $s === 'rejected')->all());
        $this->assertNotContains($mid->id, collect($filtered->json('data'))->pluck('id')->all());
        $this->assertSame(VisitorMemory::query()->where('status', 'rejected')->count() > 50, $filtered->json('meta.has_more'));
    }

    /** CA-07 */
    public function test_ca07_invalid_status_or_page_returns_422(): void
    {
        $user = $this->createMemoryStaff();
        $this->actingAs($user, 'web');

        $this->getJson('/api/v1/admin/memories?status=published')->assertStatus(422)
            ->assertJsonPath('errors.status.0', 'El estado no es válido.');
        $this->getJson('/api/v1/admin/memories?page=0')->assertStatus(422)
            ->assertJsonPath('errors.page.0', 'La página debe ser un número entero mayor o igual que 1.');
        $this->getJson('/api/v1/admin/memories?page=abc')->assertStatus(422);
        $this->getJson('/api/v1/admin/memories?limit=51')->assertStatus(422)
            ->assertJsonPath('errors.limit.0', 'El tamaño de página debe estar entre 1 y 50.');
    }
}
