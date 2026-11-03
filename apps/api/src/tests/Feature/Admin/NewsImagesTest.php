<?php

namespace Tests\Feature\Admin;

use App\Models\News;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;

class NewsImagesTest extends AdminFeatureTestCase
{
    private const BASE = '/api/v1/admin/news';

    public function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function payload(array $override = []): array
    {
        return array_merge(['title' => 'Noticia '.bin2hex(random_bytes(3)), 'description' => 'D', 'content' => 'Contenido', 'category' => 'General', 'published_date' => '2099-05-01'], $override);
    }

    private function make(array $attributes = []): News
    {
        return News::query()->create(array_merge($this->payload(), ['is_active' => true], $attributes));
    }

    private function withPath(News $model, ?string $path): News
    {
        $model->image_path = $path;
        $model->save();

        return $model->fresh();
    }

    private function stored(string $name = 'a.jpg'): string
    {
        $path = 'news/'.Str::uuid().'.'.pathinfo($name, PATHINFO_EXTENSION);
        Storage::disk('public')->put($path, 'x');

        return $path;
    }

    private function update(int $id, array $data)
    {
        return $this->post(self::BASE."/{$id}", array_merge($this->payload(), ['_method' => 'PATCH'], $data), ['Accept' => 'application/json']);
    }

    private function allFiles(): array
    {
        return Storage::disk('public')->allFiles();
    }

    /** CA-01 */
    public function test_ca01_event_news_images_uploads_jpg_png_and_webp_on_create_and_update(): void
    {
        $admin = $this->createAccount('admin');

        foreach (['a.jpg', 'b.png', 'c.webp'] as $name) {
            $created = $this->actAs($admin)->post(self::BASE, $this->payload(['image' => UploadedFile::fake()->image($name, 40, 40)]), ['Accept' => 'application/json'])
                ->assertCreated();
            $path = $created->json('data.image_path');
            $this->assertMatchesRegularExpression('#^news/[0-9a-f-]{36}\.(jpg|png|webp)$#', $path);
            $this->assertNotSame($name, basename($path));
            Storage::disk('public')->assertExists($path);
            $this->assertNotNull($created->json('data.image_url'));
            $this->assertStringContainsString($path, $created->json('data.image_url'));
        }

        $model = $this->make();
        $updated = $this->actAs($admin)->update($model->id, ['image' => UploadedFile::fake()->image('d.png', 40, 40)])->assertOk();
        Storage::disk('public')->assertExists($updated->json('data.image_path'));
        $this->assertNotNull($updated->json('data.image_url'));
    }

    /** CA-02 */
    public function test_ca02_event_news_images_rejects_invalid_type_and_size_without_writing(): void
    {
        $admin = $this->createAccount('admin');
        $model = $this->make();

        $invalid = [
            UploadedFile::fake()->create('a.gif', 10, 'image/gif'),
            UploadedFile::fake()->create('a.pdf', 10, 'application/pdf'),
            UploadedFile::fake()->createWithContent('a.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
            UploadedFile::fake()->create('big.jpg', 5121, 'image/jpeg'),
        ];

        foreach ($invalid as $file) {
            $this->actAs($admin)->post(self::BASE, $this->payload(['image' => $file]), ['Accept' => 'application/json'])
                ->assertUnprocessable()->assertJsonValidationErrors('image');
            $this->actAs($admin)->update($model->id, ['image' => $file, 'title' => 'Cambio'])
                ->assertUnprocessable()->assertJsonValidationErrors('image');
        }

        $this->assertSame([], $this->allFiles());
        $this->assertSame($model->title, $model->fresh()->title);
    }

    /** CA-03 */
    public function test_ca03_event_news_images_replaces_the_previous_file_and_new_file_wins_over_remove_image(): void
    {
        $admin = $this->createAccount('admin');
        $old = $this->stored();
        $model = $this->withPath($this->make(), $old);

        $response = $this->actAs($admin)->update($model->id, ['image' => UploadedFile::fake()->image('n.jpg'), 'remove_image' => '1'])->assertOk();
        $new = $response->json('data.image_path');

        $this->assertNotSame($old, $new);
        Storage::disk('public')->assertMissing($old);
        Storage::disk('public')->assertExists($new);
        $this->assertNotNull($response->json('data.image_url'));
        $this->assertSame($new, $model->fresh()->image_path);
    }

    /** CA-04 */
    public function test_ca04_event_news_images_removes_the_image_with_remove_image(): void
    {
        $admin = $this->createAccount('admin');
        $old = $this->stored();
        $model = $this->withPath($this->make(), $old);

        $this->actAs($admin)->update($model->id, ['remove_image' => '1'])->assertOk()
            ->assertJsonPath('data.image_path', null)->assertJsonPath('data.image_url', null);

        Storage::disk('public')->assertMissing($old);
        $this->assertNull($model->fresh()->image_path);
    }

    /** CA-05 */
    public function test_ca05_event_news_images_keeps_the_image_without_file_or_with_false_remove_image(): void
    {
        $admin = $this->createAccount('admin');
        $old = $this->stored();
        $model = $this->withPath($this->make(), $old);

        $this->actAs($admin)->update($model->id, [])->assertOk()->assertJsonPath('data.image_path', $old);
        $this->actAs($admin)->update($model->id, ['remove_image' => '0'])->assertOk()->assertJsonPath('data.image_path', $old);
        $this->actAs($admin)->patchJson(self::BASE."/{$model->id}", $this->payload())->assertOk()->assertJsonPath('data.image_path', $old);

        Storage::disk('public')->assertExists($old);
    }

    /** CA-06 */
    public function test_ca06_event_news_images_creates_without_image_with_null_path_and_url(): void
    {
        $admin = $this->createAccount('admin');

        $this->actAs($admin)->postJson(self::BASE, $this->payload())->assertCreated()
            ->assertJsonPath('data.image_path', null)->assertJsonPath('data.image_url', null);
        $this->assertSame([], $this->allFiles());
    }

    /** CA-07 */
    public function test_ca07_event_news_images_soft_deletes_nulls_the_path_and_removes_the_file(): void
    {
        $admin = $this->createAccount('admin');
        $path = $this->stored();
        $model = $this->withPath($this->make(), $path);

        $this->actAs($admin)->deleteJson(self::BASE."/{$model->id}")->assertNoContent();

        $this->assertSoftDeleted('news', ['id' => $model->id, 'image_path' => null]);
        $this->assertNotNull(DB::table('news')->where('id', $model->id)->value('deleted_at'));
        $this->assertNull(DB::table('news')->where('id', $model->id)->value('image_path'));
        $this->assertNotContains($model->id, collect($this->actAs($admin)->getJson(self::BASE)->assertOk()->json('data'))->pluck('id')->all());
        Storage::disk('public')->assertMissing($path);
        $this->actAs($admin)->patchJson(self::BASE."/{$model->id}", $this->payload())->assertNotFound()->assertJsonPath('message', 'Noticia no encontrada.');

        Storage::disk('public')->put('news/keep.txt', 'k');
        $plain = $this->make();
        $this->actAs($admin)->deleteJson(self::BASE."/{$plain->id}")->assertNoContent();
        Storage::disk('public')->assertExists('news/keep.txt');
        $this->assertSoftDeleted('news', ['id' => $plain->id]);
    }

    /** CA-08 */
    public function test_ca08_event_news_images_never_deletes_files_for_external_paths(): void
    {
        $admin = $this->createAccount('admin');
        Storage::disk('public')->put('other/secret.jpg', 'x');
        Storage::disk('public')->put('news/not-managed.jpg', 'x');

        foreach (['https://example.test/x.jpg', 'other/secret.jpg', 'news/not-managed.jpg', '../outside.jpg'] as $external) {
            $model = $this->make();
            DB::table('news')->where('id', $model->id)->update(['image_path' => $external]);

            $row = collect($this->actAs($admin)->getJson(self::BASE)->assertOk()->json('data'))->firstWhere('id', $model->id);
            $this->assertSame($external, $row['image_path']);
            $this->assertNull($row['image_url']);

            $this->actAs($admin)->update($model->id, ['remove_image' => '1'])->assertOk()->assertJsonPath('data.image_url', null);
            $model = $this->withPath($model, $external);
            $this->actAs($admin)->deleteJson(self::BASE."/{$model->id}")->assertNoContent();
        }

        Storage::disk('public')->assertExists('other/secret.jpg');
        Storage::disk('public')->assertExists('news/not-managed.jpg');
    }

    /** CA-09 */
    public function test_ca09_event_news_images_ignores_image_path_from_the_request(): void
    {
        $admin = $this->createAccount('admin');

        $created = $this->actAs($admin)->postJson(self::BASE, $this->payload(['image_path' => 'news/'.Str::uuid().'.jpg']))
            ->assertCreated()->assertJsonPath('data.image_path', null);

        $this->actAs($admin)->patchJson(self::BASE.'/'.$created->json('data.id'), $this->payload(['image_path' => 'https://evil.test/x.jpg']))
            ->assertOk()->assertJsonPath('data.image_path', null);
    }

    /** CA-10 */
    public function test_ca10_event_news_images_forbids_users_without_permission_and_touches_no_files(): void
    {
        $path = $this->stored();
        $model = $this->withPath($this->make(), $path);

        foreach (['executive', 'cashier', 'veterinarian'] as $role) {
            $user = $this->createAccount($role);

            $this->actAs($user)->post(self::BASE, $this->payload(['image' => UploadedFile::fake()->image('a.jpg')]), ['Accept' => 'application/json'])->assertForbidden();
            $this->actAs($user)->update($model->id, ['image' => UploadedFile::fake()->image('b.jpg')])->assertForbidden();
            $this->actAs($user)->update($model->id, ['remove_image' => '1'])->assertForbidden();
            $this->actAs($user)->deleteJson(self::BASE."/{$model->id}")->assertForbidden();
        }

        $this->assertSame([$path], $this->allFiles());
        $this->assertSame($path, $model->fresh()->image_path);
    }

    /** CA-11 */
    public function test_ca11_event_news_images_exposes_image_url_in_listings(): void
    {
        $admin = $this->createAccount('admin');
        $path = $this->stored();
        $with = $this->withPath($this->make(), $path);
        $without = $this->make();

        $rows = collect($this->actAs($admin)->getJson(self::BASE)->assertOk()->json('data'))->keyBy('id');

        $this->assertStringContainsString($path, $rows[$with->id]['image_url']);
        $this->assertSame($path, $rows[$with->id]['image_path']);
        $this->assertArrayHasKey('image_url', $rows[$without->id]);
        $this->assertNull($rows[$without->id]['image_url']);
    }

    /** CA-12 */
    public function test_ca12_event_news_images_logs_image_changes_without_binary_or_absolute_path(): void
    {
        $admin = $this->createAccount('admin');
        $created = $this->actAs($admin)->post(self::BASE, $this->payload(['image' => UploadedFile::fake()->image('a.jpg')]), ['Accept' => 'application/json'])->assertCreated();
        $id = $created->json('data.id');
        $this->actAs($admin)->update($id, ['image' => UploadedFile::fake()->image('b.png')])->assertOk();
        $this->actAs($admin)->update($id, ['remove_image' => '1'])->assertOk();
        $this->actAs($admin)->deleteJson(self::BASE."/{$id}")->assertNoContent();

        $logs = Activity::query()->where('log_name', 'admin')->where('subject_id', $id)->where('subject_type', News::class)->get();
        $actions = $logs->where('event', 'image-changed')->map(fn ($l) => $l->properties['action'])->values()->all();

        $this->assertSame(['set', 'replaced', 'removed'], $actions);
        $this->assertTrue($logs->contains('event', 'created'));
        $this->assertTrue($logs->contains('event', 'updated'));
        $this->assertTrue($logs->contains('event', 'deleted'));
        $dump = $logs->toJson();
        $this->assertStringNotContainsString(Storage::disk('public')->path(''), $dump);
        $this->assertStringNotContainsString(storage_path(), $dump);
    }

    /** RN-04 */
    public function test_rn04_event_news_images_deletes_the_new_file_when_the_save_transaction_fails(): void
    {
        $admin = $this->createAccount('admin');
        $old = $this->stored();
        $model = $this->withPath($this->make(), $old);
        News::saving(fn () => throw new \RuntimeException('forced failure'));

        $this->actAs($admin)->update($model->id, ['image' => UploadedFile::fake()->image('n.jpg')])->assertStatus(500);
        $this->actAs($admin)->post(self::BASE, $this->payload(['image' => UploadedFile::fake()->image('c.jpg')]), ['Accept' => 'application/json'])->assertStatus(500);

        $this->assertSame([$old], $this->allFiles());
        $this->assertSame($old, $model->fresh()->image_path);
    }
}
