<?php

namespace Tests\Feature\Memories;

use App\Models\VisitorMemory;
use App\Models\VisitorMemoryReview;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\FeatureTestCase;

class MemoryModelTest extends FeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** CA-20 */
    public function test_ca20_models_use_soft_deletes_and_no_hard_delete_path(): void
    {
        foreach ([VisitorMemory::class, VisitorMemoryReview::class] as $class) {
            $this->assertContains(SoftDeletes::class, class_uses_recursive($class));
        }

        $memory = $this->createMemory();
        $memory->delete();

        $this->assertSoftDeleted('visitor_memories', ['id' => $memory->id]);
        $this->assertNotNull(VisitorMemory::withTrashed()->find($memory->id));

        $sources = file_get_contents(app_path('Models/VisitorMemory.php')).file_get_contents(app_path('Models/VisitorMemoryReview.php'));
        $this->assertStringNotContainsString('forceDelete', $sources);

        $fillable = (new VisitorMemory)->getFillable();
        foreach (['id', 'status', 'resubmitted_count', 'deleted_at'] as $guarded) {
            $this->assertNotContains($guarded, $fillable);
        }
    }

    /** CA-18 */
    public function test_ca18_accepted_current_memory_is_in_public_scope(): void
    {
        $now = Carbon::parse('2026-11-13 12:00:00');
        Carbon::setTestNow($now);

        $visible = $this->createMemory(['published_at' => $now->copy()->subDay(), 'published_until' => $now->copy()->addDay()], 'accepted');
        $others = collect(['submitted', 'in_review', 'rejected'])
            ->map(fn ($status) => $this->createMemory(['published_until' => $now->copy()->addDay()], $status));
        $expired = $this->createMemory(['published_until' => $now->copy()->subSecond()], 'accepted');
        $boundary = $this->createMemory(['published_until' => $now->copy()], 'accepted');
        $trashed = $this->createMemory(['published_until' => $now->copy()->addDay()], 'accepted');
        $trashed->delete();

        $ids = VisitorMemory::query()->publiclyVisible($now)->pluck('id')->all();

        $this->assertContains($visible->id, $ids);
        foreach ($others->push($expired, $boundary, $trashed) as $hidden) {
            $this->assertNotContains($hidden->id, $ids);
        }
    }

    /** CA-31 */
    public function test_ca31_expired_memory_keeps_status_row_and_file_without_audit(): void
    {
        $now = Carbon::parse('2026-11-13 12:00:00');
        Carbon::setTestNow($now);
        $memory = $this->createMemory(['published_until' => $now->copy()->addDay()], 'accepted');
        $before = Activity::query()->count();

        Carbon::setTestNow($now->copy()->addDays(2));
        $fresh = VisitorMemory::query()->find($memory->id);

        $this->assertSame('accepted', $fresh->status);
        $this->assertNotNull($fresh->image_path);
        $this->assertFalse($fresh->isPublished());
        $this->assertNull(VisitorMemory::query()->publiclyVisible(now())->find($memory->id));
        $this->assertSame($before, Activity::query()->count());
    }
}
