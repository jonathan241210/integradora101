<?php

namespace Tests\Feature\Media;

use App\Actions\Media\ResolveMediaDiskAction;
use App\Models\VisitorMemory;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\Concerns\InteractsWithVisitorMemories;
use Tests\Feature\Visitor\VisitorFeatureTestCase;

/**
 * api-013: almacenamiento de fotos de momentos (CA-05, CA-08, CA-09). Implementado en api-010.
 */
class MemoryMediaStorageTest extends VisitorFeatureTestCase
{
    use CreatesMemoryFixtures;
    use InteractsWithVisitorMemories;

    /** CA-05 */
    public function test_ca05_private_scope_uses_media_memories_and_null_url_when_not_accepted(): void
    {
        config(['filesystems.media_scopes.private' => 'media']);
        Storage::fake('media');
        $this->assertSame('media', app(ResolveMediaDiskAction::class)->privateDisk());
        [$token, $visitor] = $this->memoryVisitor();

        $response = $this->submitMemory($token)->assertCreated();

        $memory = VisitorMemory::query()->where('visitor_id', $visitor->id)->firstOrFail();
        $this->assertMatchesRegularExpression('#^memories/[0-9a-f-]{36}\.jpg$#', $memory->image_path);
        $this->assertTrue(Storage::disk('media')->exists($memory->image_path));
        $this->assertNull($memory->published_image_path);
        $this->assertStringNotContainsString('image_url', $response->getContent());
        $this->assertStringNotContainsString($memory->image_path, $response->getContent());
    }

    /** CA-09 */
    public function test_ca09_private_upload_under_memories_strips_metadata_and_no_url(): void
    {
        $disk = $this->fakeMemoryDisk();
        [$token, $visitor] = $this->memoryVisitor();

        $bytes = $this->memoryImageBytes();
        $gps = "Exif\0\0GPSLatitude=20.0833;GPSLongitude=-98.3667";
        $dirty = substr($bytes, 0, 2)."\xFF\xE1".pack('n', strlen($gps) + 2).$gps.substr($bytes, 2);

        $response = $this->submitMemory($token, ['image' => $this->memoryImage('jpeg', 1, $dirty, '../../etc/passwd.jpg')])->assertCreated();

        $memory = VisitorMemory::query()->where('visitor_id', $visitor->id)->firstOrFail();
        $this->assertSame([$memory->image_path], $disk->allFiles());
        $this->assertStringStartsWith('memories/', $memory->image_path);
        $this->assertStringNotContainsString('GPSLatitude', $disk->get($memory->image_path));
        $this->assertStringNotContainsString('http', $response->getContent());
        $this->assertStringNotContainsString('passwd', $response->getContent());
    }

    /** CA-08 */
    public function test_ca08_memory_write_failure_returns_5xx_and_creates_no_record(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $this->fakeMemoryDisk();
        $disk = Mockery::mock(Filesystem::class);
        $disk->shouldReceive('put')->once()->andReturn(false);
        Storage::set(config('filesystems.media_scopes.private'), $disk);

        $this->submitMemory($token)->assertStatus(500);

        $this->assertSame(0, VisitorMemory::withTrashed()->where('visitor_id', $visitor->id)->count());
    }
}
