<?php

namespace Tests\Feature\Memories;

use App\Models\VisitorMemory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\FeatureTestCase;

/**
 * api-010 T-26: integración con la lectura pública de api-012 (GET /api/v1/memories).
 */
class MemoriesPublicReadIntegrationTest extends FeatureTestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function isolate(): void
    {
        DB::table('visitor_memories')->whereNull('deleted_at')->update(['deleted_at' => now()]);
    }

    /** @param array<string, mixed> $attributes */
    private function memory(string $status, array $attributes = []): VisitorMemory
    {
        $memory = new VisitorMemory(array_merge([
            'opinion' => 'Opinión '.Str::random(6),
            'image_path' => 'memories/'.Str::uuid().'.jpg',
            'image_sha256' => hash('sha256', Str::random(12)),
            'consent_at' => now(),
            'terms_version' => 'v1',
        ], $attributes));
        $memory->forceFill(['status' => $status])->save();

        return $memory;
    }

    /** CA-17 */
    public function test_ca17_public_list_never_exposes_non_accepted_memories(): void
    {
        $this->isolate();
        $name = config('filesystems.media_scopes.public');
        Storage::fake($name, ['url' => config("filesystems.disks.$name.url")]);

        $window = ['published_at' => now()->subHour(), 'published_until' => now()->addDay()];
        $files = [];
        $ids = [];
        foreach (['submitted', 'in_review', 'rejected'] as $status) {
            $file = 'memories/'.Str::uuid().'.jpg';
            Storage::disk($name)->put($file, 'x');
            $files[] = $file;
            $ids[] = $this->memory($status, ['image_path' => $file, 'published_image_path' => $file] + $window)->id;
        }

        $response = $this->getJson('/api/v1/memories')->assertOk();

        $this->assertSame([], $response->json('data'));
        foreach ([...$files, 'image_path', 'image_url'] as $needle) {
            $this->assertStringNotContainsString($needle, $response->getContent());
        }
        $this->assertSame([], array_intersect($ids, array_column($response->json('data'), 'id')));
    }

    /** CA-18 */
    public function test_ca18_public_list_shows_image_and_opinion_only(): void
    {
        $this->isolate();
        $name = config('filesystems.media_scopes.public');
        Storage::fake($name, ['url' => config("filesystems.disks.$name.url")]);
        $file = 'memories/'.Str::uuid().'.jpg';
        Storage::disk($name)->put($file, 'x');

        $memory = $this->memory('accepted', [
            'opinion' => 'Gran visita',
            'image_path' => $file,
            'published_image_path' => $file,
            'published_at' => now()->subHour(),
            'published_until' => now()->addDay(),
        ]);

        $item = $this->getJson('/api/v1/memories')->assertOk()->json('data.0');

        $this->assertSame(['id', 'opinion', 'image_url', 'published_at'], array_keys($item));
        $this->assertSame($memory->id, $item['id']);
        $this->assertSame('Gran visita', $item['opinion']);
        $this->assertStringEndsWith('/'.$file, $item['image_url']);
    }

    /** CA-31 */
    public function test_ca31_public_list_excludes_expired(): void
    {
        $this->isolate();
        $t = Carbon::parse('2026-11-13 12:00:00');
        Carbon::setTestNow($t);

        $memory = $this->memory('accepted', ['published_at' => $t->copy()->subDay(), 'published_until' => $t->copy()->addMinute()]);
        $this->assertSame([$memory->id], array_column($this->getJson('/api/v1/memories')->assertOk()->json('data'), 'id'));

        Carbon::setTestNow($t->copy()->addMinute());
        $this->assertSame([], $this->getJson('/api/v1/memories')->assertOk()->json('data'));
        $this->assertSame('accepted', DB::table('visitor_memories')->where('id', $memory->id)->value('status'));
        $this->assertNull(DB::table('visitor_memories')->where('id', $memory->id)->value('deleted_at'));
    }
}
