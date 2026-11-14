<?php

namespace Tests\Feature\Media;

use App\Models\News;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\Feature\Admin\AdminFeatureTestCase;

/**
 * api-013: write failure on the scope disk (CA-08, news and events).
 */
class SharedMediaWriteFailureTest extends AdminFeatureTestCase
{
    /** CA-08 */
    public function test_ca08_write_failure_returns_5xx_and_creates_no_record(): void
    {
        config(['filesystems.media_scopes.public' => 'media']);
        $disk = Mockery::mock(Filesystem::class);
        $disk->shouldReceive('put')->andReturn(false);
        $disk->shouldNotReceive('delete');
        Storage::set('media', $disk);

        $admin = $this->createAccount('admin');
        $title = 'Fallo '.bin2hex(random_bytes(4));
        $newsBefore = News::query()->withTrashed()->count();

        $this->actAs($admin)->post('/api/v1/admin/news', [
            'title' => $title, 'description' => 'D', 'content' => 'C', 'category' => 'General', 'published_date' => '2099-05-01',
            'image' => UploadedFile::fake()->image('a.jpg', 40, 40),
        ], ['Accept' => 'application/json'])->assertStatus(500);

        $this->actAs($admin)->post('/api/v1/admin/events', [
            'name' => $title, 'description' => 'D', 'start_date' => '2099-05-01', 'end_date' => '2099-05-02',
            'start_time' => '10:00', 'end_time' => '12:30', 'location' => 'Plaza',
            'image' => UploadedFile::fake()->image('b.jpg', 40, 40),
        ], ['Accept' => 'application/json'])->assertStatus(500);

        $this->assertSame($newsBefore, News::query()->withTrashed()->count());
        $this->assertDatabaseMissing('news', ['title' => $title]);
        $this->assertDatabaseMissing('events', ['name' => $title]);
    }
}
