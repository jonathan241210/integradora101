<?php

namespace Tests\Feature\Media;

use App\Models\Event;
use App\Models\News;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Feature\Admin\AdminFeatureTestCase;

/**
 * api-013: news and events images on the scope disk (CA-03, CA-07, CA-14, CA-16, CA-18).
 */
class SharedMediaStorageTest extends AdminFeatureTestCase
{
    private const NEWS = '/api/v1/admin/news';

    private const EVENTS = '/api/v1/admin/events';

    private const URL = 'http://media-a.test/files';

    private ?User $admin = null;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'filesystems.media_scopes.public' => 'media',
            'filesystems.media_scopes.private' => 'media',
            'filesystems.disks.media.url' => self::URL,
        ]);
        Storage::fake('media', ['url' => self::URL]);
    }

    private function news(array $override = []): array
    {
        return array_merge(['title' => 'Noticia '.bin2hex(random_bytes(3)), 'description' => 'D', 'content' => 'Contenido', 'category' => 'General', 'published_date' => '2099-05-01'], $override);
    }

    private function event(array $override = []): array
    {
        return array_merge(['name' => 'Evento '.bin2hex(random_bytes(3)), 'description' => 'D', 'start_date' => '2099-05-01', 'end_date' => '2099-05-02', 'start_time' => '10:00', 'end_time' => '12:30', 'location' => 'Plaza'], $override);
    }

    private function admin(): User
    {
        return $this->admin ??= $this->createAccount('admin');
    }

    private function createNews(array $override = [])
    {
        return $this->actAs($this->admin())
            ->post(self::NEWS, $this->news($override), ['Accept' => 'application/json']);
    }

    private function createEvent(array $override = [])
    {
        return $this->actAs($this->admin())
            ->post(self::EVENTS, $this->event($override), ['Accept' => 'application/json']);
    }

    /** CA-03 */
    public function test_ca03_public_url_comes_from_disk_url_not_app_url(): void
    {
        config(['app.url' => 'http://app-one.test']);
        $response = $this->createNews(['image' => UploadedFile::fake()->image('a.jpg', 40, 40)])->assertCreated();
        $path = $response->json('data.image_path');

        $this->assertSame(self::URL.'/'.$path, $response->json('data.image_url'));

        config(['app.url' => 'http://app-two.test']);
        $event = $this->createEvent(['image' => UploadedFile::fake()->image('b.png', 40, 40)])->assertCreated();

        $this->assertStringStartsWith(self::URL.'/events/', $event->json('data.image_url'));
        $this->assertStringNotContainsString('app-two.test', $event->json('data.image_url'));
    }

    /** CA-07 */
    public function test_ca07_public_upload_goes_to_scope_disk_with_relative_path(): void
    {
        Storage::fake('public');

        $news = $this->createNews(['image' => UploadedFile::fake()->image('a.jpg', 40, 40)])->assertCreated();
        $event = $this->createEvent(['image' => UploadedFile::fake()->image('b.webp', 40, 40)])->assertCreated();

        $this->assertMatchesRegularExpression('#^news/[0-9a-f-]{36}\.jpg$#', $news->json('data.image_path'));
        $this->assertMatchesRegularExpression('#^events/[0-9a-f-]{36}\.webp$#', $event->json('data.image_path'));
        Storage::disk('media')->assertExists($news->json('data.image_path'));
        Storage::disk('media')->assertExists($event->json('data.image_path'));
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertStringStartsWith(self::URL.'/', $news->json('data.image_url'));
    }

    /** CA-14 (news and events; memories close with T-08 of api-013) */
    public function test_ca14_shared_folder_write_under_news_events_memories(): void
    {
        $news = $this->createNews(['image' => UploadedFile::fake()->image('a.png', 40, 40)])->assertCreated();
        $event = $this->createEvent(['image' => UploadedFile::fake()->image('b.jpg', 40, 40)])->assertCreated();

        $this->assertSame(['news', 'events'], [
            Str::before($news->json('data.image_path'), '/'),
            Str::before($event->json('data.image_path'), '/'),
        ]);
        $this->assertCount(2, Storage::disk('media')->allFiles());
        $this->assertStringStartsWith(self::URL.'/news/', $news->json('data.image_url'));
        $this->assertStringStartsWith(self::URL.'/events/', $event->json('data.image_url'));
    }

    /** CA-16 */
    public function test_ca16_database_keeps_relative_path_when_url_changes(): void
    {
        $created = $this->createNews(['image' => UploadedFile::fake()->image('a.jpg', 40, 40)])->assertCreated();
        $id = $created->json('data.id');
        $stored = DB::table('news')->where('id', $id)->value('image_path');

        config(['filesystems.disks.media.url' => 'http://media-b.test/other', 'app.url' => 'http://app-three.test']);
        Storage::forgetDisk('media');

        $row = collect($this->actAs($this->admin())->getJson(self::NEWS)->assertOk()->json('data'))->firstWhere('id', $id);

        $this->assertSame($stored, DB::table('news')->where('id', $id)->value('image_path'));
        $this->assertSame('http://media-b.test/other/'.$stored, $row['image_url']);
        $this->assertStringNotContainsString('http', $stored);
        $this->assertStringStartsNotWith('/', $stored);
    }

    /** CA-18 (news and events) */
    public function test_ca18_replace_remove_and_delete_remove_files_after_commit_news_events(): void
    {
        $admin = $this->admin();

        foreach ([['news', self::NEWS, News::class, 'news'], ['events', self::EVENTS, Event::class, 'events']] as [$folder, $base, $model, $table]) {
            $payload = $folder === 'news' ? $this->news() : $this->event();
            $created = $this->actAs($admin)->post($base, array_merge($payload, ['image' => UploadedFile::fake()->image('a.jpg', 40, 40)]), ['Accept' => 'application/json'])->assertCreated();
            $id = $created->json('data.id');
            $first = $created->json('data.image_path');

            $replaced = $this->actAs($admin)->post("{$base}/{$id}", array_merge($payload, ['_method' => 'PATCH', 'image' => UploadedFile::fake()->image('b.jpg', 40, 40)]), ['Accept' => 'application/json'])->assertOk();
            $second = $replaced->json('data.image_path');
            $this->assertNotSame($first, $second);
            Storage::disk('media')->assertMissing($first);
            Storage::disk('media')->assertExists($second);

            $this->actAs($admin)->post("{$base}/{$id}", array_merge($payload, ['_method' => 'PATCH', 'remove_image' => '1']), ['Accept' => 'application/json'])->assertOk();
            Storage::disk('media')->assertMissing($second);

            $again = $this->actAs($admin)->post("{$base}/{$id}", array_merge($payload, ['_method' => 'PATCH', 'image' => UploadedFile::fake()->image('c.jpg', 40, 40)]), ['Accept' => 'application/json'])->assertOk();
            $third = $again->json('data.image_path');
            Storage::disk('media')->assertExists($third);

            $this->actAs($admin)->deleteJson("{$base}/{$id}")->assertNoContent();
            Storage::disk('media')->assertMissing($third);
            $this->assertSoftDeleted($table, ['id' => $id]);
        }

        $this->assertSame([], Storage::disk('media')->allFiles());
    }
}
