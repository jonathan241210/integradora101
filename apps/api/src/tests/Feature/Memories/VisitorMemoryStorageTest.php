<?php

namespace Tests\Feature\Memories;

use App\Actions\Memories\Media\StoreMemoryImageAction;
use App\Models\VisitorMemory;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\Concerns\InteractsWithVisitorMemories;
use Tests\Feature\Visitor\VisitorFeatureTestCase;

class VisitorMemoryStorageTest extends VisitorFeatureTestCase
{
    use CreatesMemoryFixtures;
    use InteractsWithVisitorMemories;

    /** CA-02 (api-013 CA-08) */
    public function test_api013_ca08_storage_failure_creates_nothing(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $this->fakeMemoryDisk();

        foreach ([false, new \RuntimeException('disco caído')] as $failure) {
            $disk = Mockery::mock(Filesystem::class);
            $expectation = $disk->shouldReceive('put')->once();
            $failure instanceof \Throwable ? $expectation->andThrow($failure) : $expectation->andReturn($failure);
            Storage::set(config('filesystems.media_scopes.private'), $disk);

            $this->submitMemory($token)->assertStatus(500);

            $this->assertSame(0, VisitorMemory::withTrashed()->where('visitor_id', $visitor->id)->count());
        }
    }

    /** CA-02 (api-013 CA-08): un fallo después de escribir el archivo lo borra. */
    public function test_api013_ca08_file_is_removed_when_the_insert_fails(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();

        VisitorMemory::creating(fn () => throw new \RuntimeException('falla el insert'));

        try {
            $this->submitMemory($token)->assertStatus(500);
        } finally {
            VisitorMemory::flushEventListeners();
        }

        $this->assertNothingStored($disk, $visitor->id);
    }

    /** CA-02 (api-013 CA-09) */
    public function test_api013_ca09_memory_file_is_stored_under_memories_without_metadata(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();

        $bytes = $this->memoryImageBytes();
        // APP1 con texto de ubicación y COM con un comentario: ninguno debe llegar al disco.
        $gps = "Exif\0\0GPSLatitude=20.0833;GPSLongitude=-98.3667";
        $com = 'comentario-secreto';
        $dirty = substr($bytes, 0, 2)
            ."\xFF\xE1".pack('n', strlen($gps) + 2).$gps
            ."\xFF\xFE".pack('n', strlen($com) + 2).$com
            .substr($bytes, 2);

        $this->submitMemory($token, ['image' => $this->memoryImage('jpeg', 1, $dirty, '../../etc/passwd.jpg')])->assertCreated();

        $memory = VisitorMemory::query()->where('visitor_id', $visitor->id)->firstOrFail();
        $this->assertMatchesRegularExpression('#^memories/[0-9a-f-]{36}\.jpg$#', $memory->image_path);
        $this->assertSame([$memory->image_path], $disk->allFiles());

        $stored = $disk->get($memory->image_path);
        $this->assertStringNotContainsString('GPSLatitude', $stored);
        $this->assertStringNotContainsString($com, $stored);
        $this->assertSame(hash('sha256', $stored), $memory->image_sha256);
        $this->assertNotSame(hash('sha256', $dirty), $memory->image_sha256);
    }

    /** CA-02 (api-013 CA-09): PNG y WebP también se guardan con la extensión del MIME validado. */
    public function test_api013_ca09_extension_follows_the_validated_mime(): void
    {
        $disk = $this->fakeMemoryDisk();
        $action = app(StoreMemoryImageAction::class);

        foreach (['jpeg' => 'jpg', 'png' => 'png', 'webp' => 'webp'] as $format => $extension) {
            $stored = $action->execute($this->memoryImage($format));
            $this->assertMatchesRegularExpression('#^memories/[0-9a-f-]{36}\.'.$extension.'$#', $stored['path']);
            $this->assertTrue($disk->exists($stored['path']));
        }
    }
}
