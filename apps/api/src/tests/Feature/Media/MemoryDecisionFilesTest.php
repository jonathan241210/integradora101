<?php

namespace Tests\Feature\Media;

use App\Actions\Memories\Media\DeleteMemoryImageAction;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\FeatureTestCase;

/**
 * api-013: archivos al aceptar y rechazar momentos (CA-11, CA-12, CA-13, CA-18, CA-23). Implementado en api-010.
 * El borrado por baja de cuenta del visitante queda pendiente de P9 (api-010 CA-32).
 */
class MemoryDecisionFilesTest extends FeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;

    private function reject(int $id, array $fields): TestResponse
    {
        return $this->postJson("/api/v1/admin/memories/{$id}/reject", ['rejection_reason' => 'Motivo.', 'rejected_fields' => $fields]);
    }

    /** CA-11 */
    public function test_ca11_accept_keeps_file_in_place_and_sets_published_path(): void
    {
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);
        $path = $memory->image_path;
        $before = $disk->get($path);
        $this->actingAs($this->createMemoryStaff(), 'web');

        $this->postJson("/api/v1/admin/memories/{$memory->id}/accept")->assertOk();

        $fresh = $memory->fresh();
        $this->assertSame($path, $fresh->published_image_path);
        $this->assertSame([$path], $disk->allFiles());
        $this->assertSame($before, $disk->get($path));
    }

    /** CA-12 */
    public function test_ca12_reject_with_image_deletes_file_after_commit(): void
    {
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);
        $path = $memory->image_path;
        $this->actingAs($this->createMemoryStaff(), 'web');

        $this->reject($memory->id, ['image'])->assertOk();

        $this->assertFalse($disk->exists($path));
        $this->assertNull($memory->fresh()->image_path);
        $this->assertSame('rejected', $memory->fresh()->status);
    }

    /** CA-12 */
    public function test_ca12_reject_content_only_keeps_file(): void
    {
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);
        $this->actingAs($this->createMemoryStaff(), 'web');

        $this->reject($memory->id, ['content'])->assertOk();

        $this->assertTrue($disk->exists($memory->image_path));
        $this->assertSame($memory->image_path, $memory->fresh()->image_path);
    }

    /** CA-12 */
    public function test_ca12_delete_failure_rejects_and_logs(): void
    {
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);
        $path = $memory->image_path;
        $failing = \Mockery::mock($disk)->makePartial();
        $failing->shouldReceive('delete')->andThrow(new \RuntimeException('disk down'));
        Storage::set(config('filesystems.media_scopes.private'), $failing);
        Log::spy();
        $this->actingAs($this->createMemoryStaff(), 'web');

        $this->reject($memory->id, ['image'])->assertOk()->assertJsonPath('data.status', 'rejected');

        $this->assertSame('rejected', $memory->fresh()->status);
        $this->assertTrue($disk->exists($path));
        Log::shouldHaveReceived('error')->once()->withArgs(fn ($m) => ! str_contains((string) $m, 'memories/'));
    }

    /** CA-13 */
    public function test_ca13_rejected_has_no_published_path_and_no_image_in_responses(): void
    {
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);
        $path = $memory->image_path;
        $this->actingAs($this->createMemoryStaff(), 'web');

        $body = $this->reject($memory->id, ['image'])->assertOk()->getContent();
        $body .= $this->getJson("/api/v1/admin/memories/{$memory->id}")->assertOk()->getContent();

        $this->assertNull($memory->fresh()->published_image_path);
        $this->assertStringNotContainsString($path, $body);
        $this->assertStringNotContainsString('image_url', $body);
        $this->getJson("/api/v1/admin/memories/{$memory->id}/image")->assertNotFound();
    }

    /** CA-18 */
    public function test_ca18_memory_reject_and_delete_remove_files_after_commit(): void
    {
        $disk = $this->fakeMemoryDisk();
        $accepted = $this->createMemoryWithFile($disk, [], 'accepted');
        $this->actingAs($this->createMemoryStaff(), 'web');

        // Una decisión fallida no borra el archivo.
        $this->reject($accepted->id, ['image'])->assertStatus(422);
        $this->assertTrue($disk->exists($accepted->image_path));

        // Rechazo con foto: el archivo se borra tras el commit.
        $memory = $this->createMemoryWithFile($disk);
        $this->reject($memory->id, ['image'])->assertOk();
        $this->assertFalse($disk->exists($memory->image_path));

        // Borrado directo: solo rutas gestionadas.
        $managed = 'memories/'.fake()->uuid().'.png';
        $outside = 'news/'.fake()->uuid().'.png';
        $disk->put($managed, 'x');
        $disk->put($outside, 'x');
        $delete = app(DeleteMemoryImageAction::class);
        $this->assertTrue($delete->execute($managed));
        $this->assertFalse($delete->execute($outside));
        $this->assertFalse($disk->exists($managed));
        $this->assertTrue($disk->exists($outside));
    }

    /** CA-23 */
    public function test_ca23_memory_activity_log_has_no_absolute_paths(): void
    {
        $disk = $this->fakeMemoryDisk();
        $lastId = (int) Activity::query()->max('id');
        $this->actingAs($this->createMemoryStaff(), 'web');
        $first = $this->createMemoryWithFile($disk);
        $second = $this->createMemoryWithFile($disk);

        $this->postJson("/api/v1/admin/memories/{$first->id}/accept")->assertOk();
        $this->reject($second->id, ['image'])->assertOk();

        $dump = Activity::query()->where('id', '>', $lastId)->get()->toJson();
        $this->assertStringContainsString('memory_id', $dump);
        foreach ([base_path(), storage_path(), $first->image_path, $second->image_path, 'Signature=', 'X-Amz'] as $forbidden) {
            $this->assertStringNotContainsString($forbidden, $dump);
        }
    }
}
