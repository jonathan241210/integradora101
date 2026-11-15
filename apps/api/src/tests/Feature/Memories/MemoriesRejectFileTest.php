<?php

namespace Tests\Feature\Memories;

use App\Actions\Memories\Media\DeleteMemoryImageAction;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\FeatureTestCase;

class MemoriesRejectFileTest extends FeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;

    /** CA-29 */
    public function test_ca29_reject_image_deletes_file_after_commit_and_keeps_sha(): void
    {
        $user = $this->createMemoryStaff();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);
        $path = $memory->image_path;
        $sha = $memory->image_sha256;

        $this->actingAs($user, 'web')->postJson("/api/v1/admin/memories/{$memory->id}/reject", [
            'rejection_reason' => 'Foto borrosa.', 'rejected_fields' => ['image'],
        ])->assertOk();

        $this->assertFalse($disk->exists($path));
        $fresh = $memory->fresh();
        $this->assertNull($fresh->image_path);
        $this->assertSame($sha, $fresh->image_sha256);
        $this->assertSame('rejected', $fresh->status);
    }

    /** CA-29 */
    public function test_ca29_file_is_not_deleted_when_the_decision_fails(): void
    {
        $user = $this->createMemoryStaff();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk, [], 'accepted');

        $this->actingAs($user, 'web')->postJson("/api/v1/admin/memories/{$memory->id}/reject", [
            'rejection_reason' => 'x', 'rejected_fields' => ['image'],
        ])->assertStatus(422);

        $this->assertTrue($disk->exists($memory->image_path));
    }

    /** CA-29 */
    public function test_ca29_reject_content_only_keeps_file(): void
    {
        $user = $this->createMemoryStaff();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);

        $this->actingAs($user, 'web')->postJson("/api/v1/admin/memories/{$memory->id}/reject", [
            'rejection_reason' => 'Opinión no apropiada.', 'rejected_fields' => ['content'],
        ])->assertOk();

        $this->assertTrue($disk->exists($memory->image_path));
        $this->assertSame($memory->image_path, $memory->fresh()->image_path);
    }

    /** CA-29 */
    public function test_ca29_delete_failure_after_commit_keeps_rejected_and_logs(): void
    {
        $user = $this->createMemoryStaff();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);
        $path = $memory->image_path;

        $failing = \Mockery::mock($disk)->makePartial();
        $failing->shouldReceive('delete')->andThrow(new \RuntimeException('disk down '.$path));
        Storage::set(config('filesystems.media_scopes.private'), $failing);
        Log::spy();

        $this->actingAs($user, 'web')->postJson("/api/v1/admin/memories/{$memory->id}/reject", [
            'rejection_reason' => 'Foto borrosa.', 'rejected_fields' => ['image'],
        ])->assertOk()->assertJsonPath('data.status', 'rejected');

        $this->assertSame('rejected', $memory->fresh()->status);
        $this->assertNull($memory->fresh()->image_path);
        $this->assertTrue($disk->exists($path), 'el archivo queda huérfano');
        Log::shouldHaveReceived('error')->once()->withArgs(fn ($message) => ! str_contains((string) $message, 'memories/'));
    }

    /** CA-29 api013_ca18 */
    public function test_api013_ca18_deletion_only_for_managed_memory_paths(): void
    {
        $disk = $this->fakeMemoryDisk();
        $uuid = fake()->uuid();
        $unmanaged = ['news/'.$uuid.'.jpg', 'memories/'.$uuid.'.gif', 'memories/../'.$uuid.'.jpg', 'memories/short.jpg', 'memories/sub/'.$uuid.'.jpg', '/memories/'.$uuid.'.jpg'];
        foreach ($unmanaged as $path) {
            $disk->put($path, 'x');
        }
        Log::spy();

        foreach ($unmanaged as $path) {
            $this->assertFalse(app(DeleteMemoryImageAction::class)->execute($path));
            $this->assertTrue($disk->exists($path), $path);
        }
        $this->assertFalse(app(DeleteMemoryImageAction::class)->execute(null));
        Log::shouldHaveReceived('warning')->times(count($unmanaged) + 1);

        foreach (['jpg', 'jpeg', 'png', 'webp'] as $ext) {
            $managed = 'memories/'.fake()->uuid().'.'.$ext;
            $disk->put($managed, 'x');
            $this->assertTrue(app(DeleteMemoryImageAction::class)->execute($managed));
            $this->assertFalse($disk->exists($managed));
        }
    }
}
