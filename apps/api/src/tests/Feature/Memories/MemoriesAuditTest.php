<?php

namespace Tests\Feature\Memories;

use App\Models\VisitorMemory;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\FeatureTestCase;

class MemoriesAuditTest extends FeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;

    /**
     * CA-19 (in-review, accepted y rejected).
     */
    public function test_ca19_review_audit_has_actor_action_and_id_without_binary_or_path(): void
    {
        $user = $this->createMemoryStaff();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);
        $other = $this->createMemoryWithFile($disk);
        $path = $memory->image_path;
        $this->actingAs($user, 'web');

        $this->getJson("/api/v1/admin/memories/{$memory->id}")->assertOk();
        $this->postJson("/api/v1/admin/memories/{$other->id}/accept")->assertOk();
        $this->postJson("/api/v1/admin/memories/{$memory->id}/reject", [
            'rejection_reason' => 'Motivo privado', 'rejected_fields' => ['image', 'content'],
        ])->assertOk();

        $logs = Activity::query()->where('log_name', 'admin')
            ->where('subject_type', VisitorMemory::class)->where('subject_id', $memory->id)->get()->keyBy('event');

        $acceptedLog = Activity::query()->where('log_name', 'admin')->where('event', 'accepted')
            ->where('subject_type', VisitorMemory::class)->where('subject_id', $other->id)->sole();

        $this->assertEqualsCanonicalizing(['in-review', 'rejected'], $logs->keys()->all());
        $logs['accepted'] = $acceptedLog;
        $paths = [$path, $other->image_path];
        foreach ($logs as $event => $log) {
            $this->assertSame($user->id, (int) $log->causer_id, $event);
            $this->assertSame($event === 'accepted' ? $other->id : $memory->id, (int) $log->properties['memory_id'], $event);
            $dump = json_encode([$log->description, $log->properties]);
            foreach ($paths as $p) {
                $this->assertStringNotContainsString($p, $dump);
            }
            $this->assertStringNotContainsString('memories/', $dump);
            $this->assertStringNotContainsString(base_path(), $dump);
            $this->assertArrayNotHasKey('image_path', $log->properties->toArray());
        }
        $this->assertSame(['image', 'content'], $logs['rejected']->properties['rejected_fields']);
    }
}
