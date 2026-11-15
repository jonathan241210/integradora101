<?php

namespace Tests\Feature\Memories;

use App\Models\Visitor;
use App\Models\VisitorMemory;
use App\Models\VisitorMemoryReview;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\Concerns\InteractsWithVisitorMemories;
use Tests\Feature\Visitor\VisitorFeatureTestCase;

class VisitorMemoryResubmitTest extends VisitorFeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;
    use InteractsWithVisitorMemories;

    private function rejectedWithHistory(Visitor $visitor, array $attributes = []): VisitorMemory
    {
        $memory = $this->memoryOf($visitor, 'rejected', array_merge([
            'opinion' => 'Opinión original', 'rejection_reason' => 'Revisa la opinión',
            'rejected_image' => false, 'rejected_content' => true,
            'reviewed_at' => now(), 'consent_at' => now()->subDays(3), 'terms_version' => 'v0',
        ], $attributes));

        VisitorMemoryReview::query()->create([
            'visitor_memory_id' => $memory->id, 'reviewed_by' => $this->createMemoryStaff()->id, 'decision' => 'rejected', 'rejection_reason' => 'Revisa la opinión',
            'rejected_image' => (bool) ($attributes['rejected_image'] ?? false), 'rejected_content' => (bool) ($attributes['rejected_content'] ?? true),
            'reviewed_at' => now(),
        ]);

        return $memory;
    }

    /** CA-26 */
    public function test_ca26_resubmit_rejected_returns_200_and_keeps_history(): void
    {
        config(['memories.terms_version' => 'v2']);
        [$token, $visitor] = $this->memoryVisitor();
        $this->fakeMemoryDisk();
        $now = Carbon::now()->startOfSecond();
        Carbon::setTestNow($now);
        $memory = $this->rejectedWithHistory($visitor);

        $this->resubmitMemory($token, $memory->id, ['opinion' => 'Opinión corregida'])
            ->assertOk()
            ->assertJsonPath('data.id', $memory->id)
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.opinion', 'Opinión corregida')
            ->assertJsonPath('data.resubmitted_count', 1)
            ->assertJsonMissingPath('data.rejection_reason')
            ->assertJsonMissingPath('data.rejected_fields');

        $fresh = $memory->fresh();
        $this->assertSame('submitted', $fresh->status);
        $this->assertSame(1, (int) $fresh->resubmitted_count);
        $this->assertNull($fresh->rejection_reason);
        $this->assertFalse($fresh->rejected_image);
        $this->assertFalse($fresh->rejected_content);
        $this->assertSame('v2', $fresh->terms_version);
        $this->assertTrue($fresh->consent_at->equalTo($now));
        $this->assertSame(1, VisitorMemoryReview::query()->where('visitor_memory_id', $memory->id)->count());

        $this->memoryOf($visitor, 'rejected', ['rejected_content' => true, 'opinion' => 'A']); // otra abierta: el reenvío no se bloquea por límites
        $second = VisitorMemory::query()->where('visitor_id', $visitor->id)->where('opinion', 'A')->firstOrFail();
        $this->resubmitMemory($token, $second->id, ['opinion' => 'B'])->assertOk()->assertJsonPath('data.resubmitted_count', 1);
    }

    /** CA-26 */
    public function test_ca26_non_rejected_returns_422_status(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();

        foreach (['submitted', 'in_review', 'accepted'] as $status) {
            $memory = $this->memoryOf($visitor, $status, [], now()->subDays(30));
            $before = $memory->fresh()->toArray();

            $this->resubmitMemory($token, $memory->id, ['opinion' => 'Otra', 'image' => $this->memoryImage()])
                ->assertStatus(422)
                ->assertJsonPath('errors.status.0', 'Solo puedes corregir una petición rechazada.');

            $this->assertSame($before, $memory->fresh()->toArray());
        }

        $this->assertSame([], $disk->allFiles());
    }

    /** CA-26 */
    public function test_ca26_other_account_returns_404(): void
    {
        [$token] = $this->memoryVisitor();
        [, $other] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();
        $foreign = $this->rejectedWithHistory($other);

        $this->resubmitMemory($token, $foreign->id, ['opinion' => 'Intruso'])
            ->assertStatus(404)->assertJsonPath('message', 'Petición no encontrada.');
        $this->resubmitMemory($token, 99999999, ['opinion' => 'Nada'])
            ->assertStatus(404)->assertJsonPath('message', 'Petición no encontrada.');

        $this->assertSame('rejected', $foreign->fresh()->status);
        $this->assertSame([], $disk->allFiles());
    }

    /** CA-19 */
    public function test_ca19_resubmitted_audit_has_no_binary_or_path(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk, ['visitor_id' => $visitor->id, 'rejected_content' => true, 'opinion' => 'Antes', 'rejection_reason' => 'x'], 'rejected');
        $oldPath = $memory->image_path;

        $this->resubmitMemory($token, $memory->id, ['opinion' => 'Después', 'image' => $this->memoryImage('png', 4)])->assertOk();

        $log = Activity::query()->where('log_name', 'visitor-memories')->where('event', 'resubmitted')->latest('id')->firstOrFail();
        $this->assertSame($memory->id, (int) $log->subject_id);
        $this->assertSame($visitor->id, (int) $log->causer_id);
        $this->assertSame($memory->id, $log->properties['memory_id']);

        $dump = json_encode($log->toArray());
        $this->assertStringNotContainsString('memories/', $dump);
        $this->assertStringNotContainsString($oldPath, $dump);
        $this->assertStringNotContainsString($memory->fresh()->image_path, $dump);
        $this->assertStringNotContainsString(basename($disk->path('')), $dump);
        $this->assertStringNotContainsString('image_sha256', $dump);
    }

    /** CA-23 (RN-17) */
    public function test_ca23_resubmit_does_not_open_or_count_the_window(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $this->fakeMemoryDisk();
        $now = Carbon::now()->startOfSecond();
        Carbon::setTestNow($now);
        $createdAt = $now->copy()->subDays(10);
        $memory = $this->rejectedWithHistory($visitor);
        VisitorMemory::query()->whereKey($memory->id)->update(['created_at' => $createdAt]);

        $this->resubmitMemory($token, $memory->id, ['opinion' => 'Corregida'])->assertOk();

        $this->assertTrue($memory->fresh()->created_at->equalTo($createdAt));
        $memory->fresh()->forceFill(['status' => 'accepted'])->save();

        // La ventana sigue contando desde created_at, que el reenvío no cambia: ya pasó, puede enviar otra.
        $this->submitMemory($token)->assertCreated();
        $this->assertSame(2, VisitorMemory::query()->where('visitor_id', $visitor->id)->count());
    }
}
