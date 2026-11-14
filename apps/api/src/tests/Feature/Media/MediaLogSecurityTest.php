<?php

namespace Tests\Feature\Media;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\Models\Activity;
use Tests\Feature\Admin\AdminFeatureTestCase;

/**
 * api-013: no secrets, absolute paths or signed URLs in logs or responses (CA-23, news and events).
 */
class MediaLogSecurityTest extends AdminFeatureTestCase
{
    /** CA-23 */
    public function test_ca23_activity_log_and_responses_have_no_secrets_or_absolute_paths(): void
    {
        config(['filesystems.media_scopes.public' => 'media']);
        Storage::fake('media');
        $admin = $this->createAccount('admin');
        $lastId = (int) Activity::query()->max('id');
        $bodies = [];

        foreach ([['/api/v1/admin/news', ['title' => 'N '.bin2hex(random_bytes(3)), 'description' => 'D', 'content' => 'C', 'category' => 'General', 'published_date' => '2099-05-01']],
            ['/api/v1/admin/events', ['name' => 'E '.bin2hex(random_bytes(3)), 'description' => 'D', 'start_date' => '2099-05-01', 'end_date' => '2099-05-02', 'start_time' => '10:00', 'end_time' => '12:30', 'location' => 'Plaza']]] as [$base, $payload]) {
            $created = $this->actAs($admin)->post($base, array_merge($payload, ['image' => UploadedFile::fake()->image('a.jpg', 40, 40)]), ['Accept' => 'application/json'])->assertCreated();
            $id = $created->json('data.id');
            $bodies[] = $created->getContent();
            $bodies[] = $this->actAs($admin)->post("{$base}/{$id}", array_merge($payload, ['_method' => 'PATCH', 'image' => UploadedFile::fake()->image('b.png', 40, 40)]), ['Accept' => 'application/json'])->assertOk()->getContent();
            $bodies[] = $this->actAs($admin)->post("{$base}/{$id}", array_merge($payload, ['_method' => 'PATCH', 'remove_image' => '1']), ['Accept' => 'application/json'])->assertOk()->getContent();
        }

        $logs = Activity::query()->where('id', '>', $lastId)->get();
        $this->assertGreaterThanOrEqual(6, $logs->count());
        $dump = $logs->toJson().implode('', $bodies);

        foreach ([base_path(), storage_path(), Storage::disk('media')->path(''), 'Signature=', 'X-Amz', 'AWS_'] as $forbidden) {
            $this->assertStringNotContainsString($forbidden, $dump);
        }
        $this->assertStringNotContainsString("\xFF\xD8\xFF", $dump);
    }
}
