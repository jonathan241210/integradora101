<?php

namespace Tests\Feature\Memories;

use App\Models\VisitorMemory;
use App\Models\VisitorMemoryReview;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\FeatureTestCase;

class MemoriesReviewVisibilityTest extends FeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function assertClean(string $content, array $paths, string $where): void
    {
        $this->assertStringNotContainsString('image_url', $content, $where);
        $this->assertStringNotContainsString('image_path', $content, $where);
        $this->assertStringNotContainsString('published_image_path', $content, $where);
        $this->assertStringNotContainsString('image_sha256', $content, $where);
        $this->assertStringNotContainsString('memories\/', $content, $where);
        foreach ($paths as $path) {
            $this->assertStringNotContainsString($path, $content, $where);
            $this->assertStringNotContainsString(str_replace('/', '\/', $path), $content, $where);
        }
    }

    /** CA-17 */
    public function test_ca17_non_accepted_memories_have_no_image_url_in_review_responses(): void
    {
        $user = $this->createMemoryStaff();
        $disk = $this->fakeMemoryDisk();
        $toAccept = $this->createMemoryWithFile($disk);
        $toReject = $this->createMemoryWithFile($disk);
        $submitted = $this->createMemoryWithFile($disk);
        $rejected = $this->createMemoryWithFile($disk, ['rejection_reason' => 'x', 'rejected_content' => true], 'rejected');
        $paths = VisitorMemory::query()->pluck('image_path')->all();
        $this->actingAs($user, 'web');

        $this->assertClean($this->getJson('/api/v1/admin/memories')->assertOk()->getContent(), $paths, 'lista');
        foreach ([$submitted, $rejected] as $memory) {
            $this->assertClean($this->getJson("/api/v1/admin/memories/{$memory->id}")->assertOk()->getContent(), $paths, 'detalle');
        }
        $this->assertClean($this->postJson("/api/v1/admin/memories/{$toReject->id}/reject", [
            'rejection_reason' => 'x', 'rejected_fields' => ['image'],
        ])->assertOk()->getContent(), $paths, 'reject');
        $this->assertClean($this->postJson("/api/v1/admin/memories/{$toAccept->id}/accept")->assertOk()->getContent(), $paths, 'accept');
        $this->assertClean($this->postJson("/api/v1/admin/memories/{$toAccept->id}/accept")->assertStatus(422)->getContent(), $paths, 'accept 422');
        $this->assertClean($this->getJson('/api/v1/admin/memories')->getContent(), $paths, 'lista final');
    }

    /** CA-31 */
    public function test_ca31_zoo_admin_sees_publication_expired(): void
    {
        $user = $this->createMemoryStaff();
        $disk = $this->fakeMemoryDisk();
        config(['memories.publication_days' => 7]);
        $memory = $this->createMemoryWithFile($disk, [
            'published_at' => now()->subDays(8),
            'published_until' => now()->subDay(),
        ], 'accepted');
        $before = $memory->fresh()->toArray();
        $activities = Activity::query()->count();
        $reviews = VisitorMemoryReview::query()->count();

        $this->actingAs($user, 'web')->getJson("/api/v1/admin/memories/{$memory->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'accepted')
            ->assertJsonPath('data.is_published', false)
            ->assertJsonPath('data.publication_days', 7)
            ->assertJsonPath('data.published_until', $memory->published_until->toIso8601String());
        $this->getJson('/api/v1/admin/memories')->assertOk();

        $this->assertSame($before, $memory->fresh()->toArray());
        $this->assertSame($activities, Activity::query()->count());
        $this->assertSame($reviews, VisitorMemoryReview::query()->count());
        $this->assertNull($memory->fresh()->deleted_at);
    }
}
