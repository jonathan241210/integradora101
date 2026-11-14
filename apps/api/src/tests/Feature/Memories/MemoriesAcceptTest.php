<?php

namespace Tests\Feature\Memories;

use App\Models\VisitorMemoryReview;
use Illuminate\Support\Carbon;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\FeatureTestCase;

class MemoriesAcceptTest extends FeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** CA-11 */
    public function test_ca11_accept_sets_window_history_and_published_image_path(): void
    {
        Carbon::setTestNow('2026-11-13 12:00:00');
        config(['memories.publication_days' => 7]);
        $user = $this->createMemoryStaff();
        $disk = $this->fakeMemoryDisk();

        foreach (['submitted', 'in_review'] as $status) {
            $memory = $this->createMemoryWithFile($disk, [], $status);

            $this->actingAs($user, 'web')->postJson("/api/v1/admin/memories/{$memory->id}/accept")
                ->assertOk()
                ->assertJsonPath('data.status', 'accepted')
                ->assertJsonPath('data.is_published', true)
                ->assertJsonPath('data.published_until', Carbon::parse('2026-11-20 12:00:00')->toIso8601String());

            $fresh = $memory->fresh();
            $this->assertSame('accepted', $fresh->status);
            $this->assertSame($user->id, $fresh->reviewed_by);
            $this->assertNotNull($fresh->reviewed_at);
            $this->assertSame('2026-11-13 12:00:00', $fresh->published_at->format('Y-m-d H:i:s'));
            $this->assertSame('2026-11-20 12:00:00', $fresh->published_until->format('Y-m-d H:i:s'));
            $this->assertSame($memory->image_path, $fresh->published_image_path);

            $review = VisitorMemoryReview::query()->where('visitor_memory_id', $memory->id)->sole();
            $this->assertSame('accepted', $review->decision);
            $this->assertSame($user->id, $review->reviewed_by);
        }
    }

    /** CA-11 */
    public function test_ca11_accept_without_file_returns_422_and_changes_nothing(): void
    {
        $user = $this->createMemoryStaff();
        $this->fakeMemoryDisk();
        $memory = $this->createMemory();

        $this->actingAs($user, 'web')->postJson("/api/v1/admin/memories/{$memory->id}/accept")
            ->assertStatus(422)
            ->assertJsonPath('errors.image.0', 'La imagen no está disponible; no se puede aceptar.');

        $fresh = $memory->fresh();
        $this->assertSame('submitted', $fresh->status);
        $this->assertNull($fresh->published_until);
        $this->assertNull($fresh->published_image_path);
        $this->assertSame(0, VisitorMemoryReview::query()->where('visitor_memory_id', $memory->id)->count());
    }

    /** CA-11 api013_ca11 */
    public function test_api013_ca11_accept_does_not_move_the_file(): void
    {
        $user = $this->createMemoryStaff();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);
        $path = $memory->image_path;
        $before = $disk->get($path);

        $this->actingAs($user, 'web')->postJson("/api/v1/admin/memories/{$memory->id}/accept")->assertOk();

        $this->assertTrue($disk->exists($path));
        $this->assertSame($before, $disk->get($path));
        $this->assertSame($path, $memory->fresh()->image_path);
        $this->assertSame([$path], $disk->allFiles('memories'));
    }

    /** CA-13 */
    public function test_ca13_accepted_cannot_be_decided_again(): void
    {
        $user = $this->createMemoryStaff();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk, ['published_until' => now()->addDay()], 'accepted');
        $this->actingAs($user, 'web');

        $this->postJson("/api/v1/admin/memories/{$memory->id}/accept")->assertStatus(422)
            ->assertJsonPath('message', 'Esta petición ya fue revisada.');
        $this->postJson("/api/v1/admin/memories/{$memory->id}/reject", ['rejection_reason' => 'x', 'rejected_fields' => ['image']])
            ->assertStatus(422)->assertJsonPath('message', 'Esta petición ya fue revisada.');

        $this->assertSame('accepted', $memory->fresh()->status);
        $this->assertSame(0, VisitorMemoryReview::query()->where('visitor_memory_id', $memory->id)->count());
        $this->assertTrue($disk->exists($memory->image_path));
    }

    /** CA-13 */
    public function test_ca13_rejected_waits_for_visitor_correction(): void
    {
        $user = $this->createMemoryStaff();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk, ['rejection_reason' => 'Original', 'rejected_content' => true], 'rejected');

        $this->actingAs($user, 'web')->postJson("/api/v1/admin/memories/{$memory->id}/accept")->assertStatus(422)
            ->assertJsonPath('message', 'Esta petición está rechazada y espera la corrección del visitante.');

        $this->assertSame('rejected', $memory->fresh()->status);
        $this->assertNull($memory->fresh()->published_until);
    }

    /** CA-13 */
    public function test_ca13_unknown_memory_returns_404_on_accept(): void
    {
        $user = $this->createMemoryStaff();

        $this->actingAs($user, 'web')->postJson('/api/v1/admin/memories/999999999/accept')
            ->assertNotFound()->assertJsonPath('message', 'Petición no encontrada.');
    }
}
