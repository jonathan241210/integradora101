<?php

namespace Tests\Feature\Catalog;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\FeatureTestCase;

/**
 * api-012 public-memories-read. Fixtures con DB::table sobre arca_pruebas (transacción revertida).
 */
class PublicMemoriesTest extends FeatureTestCase
{
    private const FORBIDDEN_KEYS = [
        'visitor_id', 'name', 'email', 'nickname', 'avatar', 'status', 'reviewed_by', 'reviewed_at',
        'rejection_reason', 'rejected_fields', 'rejected_image', 'rejected_content', 'image_path',
        'published_image_path', 'published_until', 'deleted_at', 'resubmitted_count', 'consent_at',
        'terms_version', 'image_sha256',
    ];

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /** Oculta (borrado lógico, dentro de la transacción) las filas existentes para aislar listados. */
    private function isolate(): void
    {
        DB::table('visitor_memories')->whereNull('deleted_at')->update(['deleted_at' => now()]);
    }

    /** @param array<string, mixed> $attributes */
    private function memory(string $status = 'accepted', array $attributes = []): int
    {
        return DB::table('visitor_memories')->insertGetId(array_merge([
            'visitor_id' => null,
            'status' => $status,
            'opinion' => 'Opinión '.Str::random(6),
            'image_path' => 'memories/'.Str::uuid().'.jpg',
            'image_sha256' => hash('sha256', Str::random(12)),
            'published_image_path' => null,
            'consent_at' => now(),
            'terms_version' => 'v1',
            'reviewed_by' => null,
            'published_at' => $status === 'accepted' ? now()->subDay() : null,
            'published_until' => $status === 'accepted' ? now()->addDay() : null,
            'created_at' => now(),
            'updated_at' => now(),
        ], $attributes));
    }

    /** @return list<int> */
    private function ids(?string $query = ''): array
    {
        return array_column($this->getJson('/api/v1/memories'.$query)->assertOk()->json('data'), 'id');
    }

    private function fakePublicDisk(): string
    {
        $name = config('filesystems.media_scopes.public');
        Storage::fake($name, ['url' => config("filesystems.disks.$name.url")]);

        return $name;
    }

    /** CA-01 */
    public function test_ca01_public_memories_list_only_accepted_and_current_without_auth(): void
    {
        $this->isolate();
        $other = [$this->memory('submitted'), $this->memory('in_review'), $this->memory('rejected')];
        $trashed = $this->memory('accepted', ['deleted_at' => now()]);
        $expired = $this->memory('accepted', ['published_until' => now()->subMinute()]);
        $visible = $this->memory('accepted');

        $response = $this->getJson('/api/v1/memories')->assertOk()->assertJsonStructure(['data', 'meta']);

        $ids = array_column($response->json('data'), 'id');
        $this->assertSame([$visible], $ids);
        foreach ([...$other, $trashed, $expired] as $id) {
            $this->assertNotContains($id, $ids);
        }
    }

    /** CA-02 */
    public function test_ca02_orders_by_published_at_desc_then_id_desc_and_returns_empty_data(): void
    {
        $this->isolate();
        $this->memory('accepted', ['published_until' => now()->subDay()]);
        $this->getJson('/api/v1/memories')->assertOk()
            ->assertExactJson(['data' => [], 'meta' => ['page' => 1, 'limit' => 10, 'has_more' => false]]);

        $same = now()->subHours(2);
        $a = $this->memory('accepted', ['published_at' => $same]);
        $b = $this->memory('accepted', ['published_at' => $same]);
        $old = $this->memory('accepted', ['published_at' => now()->subDays(3)]);

        $this->assertSame([$b, $a, $old], $this->ids());
    }

    /** CA-03 */
    public function test_ca03_paginates_with_limit_page_and_meta(): void
    {
        $this->isolate();
        $created = [];
        for ($i = 1; $i <= 5; $i++) {
            $created[] = $this->memory('accepted', ['published_at' => now()->subHours(10 - $i)]);
        }
        $desc = array_reverse($created);

        $this->getJson('/api/v1/memories?limit=2&page=1')->assertOk()
            ->assertJsonPath('meta', ['page' => 1, 'limit' => 2, 'has_more' => true])
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $desc[0]);
        $this->getJson('/api/v1/memories?limit=2&page=3')->assertOk()
            ->assertJsonPath('meta', ['page' => 3, 'limit' => 2, 'has_more' => false])
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $desc[4]);
        $this->getJson('/api/v1/memories?limit=2&page=4')->assertOk()
            ->assertExactJson(['data' => [], 'meta' => ['page' => 4, 'limit' => 2, 'has_more' => false]]);
        $this->getJson('/api/v1/memories')->assertOk()
            ->assertJsonPath('meta', ['page' => 1, 'limit' => 10, 'has_more' => false])
            ->assertJsonCount(5, 'data');
    }

    /** CA-04 */
    public function test_ca04_rejects_invalid_limit_and_page_with_422_in_spanish(): void
    {
        $count = DB::table('visitor_memories')->count();
        $limit = 'El límite debe ser un número entero entre 1 y 50.';
        $page = 'La página debe ser un número entero mayor o igual a 1.';

        $cases = [
            'limit=0' => ['limit', $limit], 'limit=51' => ['limit', $limit], 'limit=abc' => ['limit', $limit],
            'limit=' => ['limit', $limit], 'limit[]=1' => ['limit', $limit],
            'page=0' => ['page', $page], 'page=1.5' => ['page', $page], 'page=' => ['page', $page],
        ];

        foreach ($cases as $query => [$field, $message]) {
            $response = $this->getJson('/api/v1/memories?'.$query)->assertStatus(422);
            $this->assertSame($message, $response->json("errors.$field.0"), $query);
            $this->assertSame($message, $response->json('message'), $query);
        }

        $this->assertSame($count, DB::table('visitor_memories')->count());
    }

    /** CA-05 */
    public function test_ca05_exposes_only_id_opinion_image_url_and_published_at(): void
    {
        $this->isolate();
        $withText = $this->memory('accepted', ['rejection_reason' => 'secreto-motivo', 'image_sha256' => str_repeat('a', 64)]);
        $noText = $this->memory('accepted', ['opinion' => null, 'published_at' => now()->subDays(2)]);

        $response = $this->getJson('/api/v1/memories')->assertOk();
        $data = $response->json('data');

        $this->assertCount(2, $data);
        foreach ($data as $item) {
            $this->assertSame(['id', 'opinion', 'image_url', 'published_at'], array_keys($item));
            $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/', $item['published_at']);
        }
        $this->assertSame($noText, $data[1]['id']);
        $this->assertNull($data[1]['opinion']);
        $this->assertSame($withText, $data[0]['id']);

        $raw = $response->getContent();
        foreach (self::FORBIDDEN_KEYS as $key) {
            $this->assertStringNotContainsString('"'.$key.'"', $raw);
        }
        $this->assertStringNotContainsString('secreto-motivo', $raw);
    }

    /** CA-06 */
    public function test_ca06_image_url_from_public_disk_or_null_when_file_is_missing(): void
    {
        $this->isolate();
        $name = $this->fakePublicDisk();
        $base = rtrim((string) config("filesystems.disks.$name.url"), '/');

        $path = 'memories/'.Str::uuid().'.jpg';
        Storage::disk($name)->put($path, 'x');
        $present = $this->memory('accepted', ['published_image_path' => $path, 'published_at' => now()->subHours(1)]);
        $missing = $this->memory('accepted', ['published_image_path' => 'memories/'.Str::uuid().'.jpg', 'published_at' => now()->subHours(2)]);
        $none = $this->memory('accepted', ['published_image_path' => null, 'published_at' => now()->subHours(3)]);
        $outside = $this->memory('accepted', ['published_image_path' => 'news/'.Str::uuid().'.jpg', 'published_at' => now()->subHours(4)]);
        $traversal = $this->memory('accepted', ['published_image_path' => 'memories/../x.jpg', 'published_at' => now()->subHours(5)]);

        $data = collect($this->getJson('/api/v1/memories')->assertOk()->json('data'))->keyBy('id');

        $this->assertSame($base.'/'.$path, $data[$present]['image_url']);
        foreach ([$missing, $none, $outside, $traversal] as $id) {
            $this->assertNull($data[$id]['image_url']);
        }
    }

    /** CA-07 */
    public function test_ca07_non_accepted_memories_never_expose_image_url_or_path(): void
    {
        $this->isolate();
        $name = $this->fakePublicDisk();
        $ids = [];
        $files = [];
        foreach (['submitted', 'in_review', 'rejected'] as $status) {
            $file = Str::uuid().'.jpg';
            $files[] = $file;
            Storage::disk($name)->put('memories/'.$file, 'x');
            $ids[] = $this->memory($status, [
                'image_path' => 'memories/'.$file,
                'published_image_path' => 'memories/'.$file,
                'published_at' => now()->subHour(),
                'published_until' => now()->addDay(),
            ]);
        }

        $response = $this->getJson('/api/v1/memories')->assertOk();
        $raw = $response->getContent();

        $this->assertSame([], $response->json('data'));
        $this->assertStringNotContainsString('image_url', $raw);
        $this->assertStringNotContainsString('image_path', $raw);
        $this->assertStringNotContainsString('memories/', $raw);
        foreach ($files as $file) {
            $this->assertStringNotContainsString($file, $raw);
        }
        foreach ($ids as $id) {
            $this->assertNotContains($id, $this->ids());
        }
    }

    /** CA-08 */
    public function test_ca08_anonymous_read_only_without_writes_audit_or_cookies(): void
    {
        $id = $this->memory('accepted');
        $tables = ['visitor_memories', 'visitor_memory_reviews', 'activity_log'];
        $before = array_map(fn ($t) => DB::table($t)->count(), $tables);
        $updatedAt = DB::table('visitor_memories')->where('id', $id)->value('updated_at');

        $response = $this->getJson('/api/v1/memories')->assertOk();

        $this->assertNull($response->headers->get('Set-Cookie'));
        $this->assertSame([], $response->headers->getCookies());
        $this->assertSame($before, array_map(fn ($t) => DB::table($t)->count(), $tables));
        $this->assertSame($updatedAt, DB::table('visitor_memories')->where('id', $id)->value('updated_at'));
        $this->assertSame('accepted', DB::table('visitor_memories')->where('id', $id)->value('status'));
    }

    /** CA-09 */
    public function test_ca09_cors_allows_only_configured_origin(): void
    {
        config(['cors.allowed_origins' => ['http://localhost:8080']]);

        $this->withHeaders(['Origin' => 'http://localhost:8080'])->getJson('/api/v1/memories')->assertOk()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
        $response = $this->withHeaders(['Origin' => 'http://127.0.0.1:8080'])->getJson('/api/v1/memories')->assertOk();
        $this->assertNotSame('http://127.0.0.1:8080', $response->headers->get('Access-Control-Allow-Origin'));
    }

    /** CA-10 */
    public function test_ca10_route_name_and_thin_controller_architecture(): void
    {
        $route = app('router')->getRoutes()->getByName('memories.index');

        $this->assertNotNull($route);
        $this->assertStringEndsWith('/api/v1/memories', route('memories.index'));
        $this->assertContains('GET', $route->methods());
        foreach ($route->gatherMiddleware() as $middleware) {
            $this->assertStringNotContainsString('auth', (string) $middleware);
            $this->assertStringNotContainsString('visitor.token', (string) $middleware);
        }

        $source = (string) file_get_contents(app_path('Http/Controllers/Catalog/PublicMemoryController.php'));
        foreach (['where(', 'VisitorMemory::', 'accepted', 'published_until'] as $forbidden) {
            $this->assertStringNotContainsString($forbidden, $source);
        }
        $this->assertStringContainsString('ListPublicMemoriesRequest', $source);
        $this->assertStringContainsString('ListPublishedMemoriesAction', $source);
        $this->assertStringContainsString('PublicMemoryResource', $source);
    }

    /** CA-12 */
    public function test_ca12_expired_or_null_publication_is_hidden_without_writes(): void
    {
        $this->isolate();
        $t = Carbon::parse('2026-11-13 12:00:00');
        Carbon::setTestNow($t);

        $equal = $this->memory('accepted', ['published_until' => $t->copy()]);
        $future = $this->memory('accepted', ['published_until' => $t->copy()->addSecond()]);
        $null = $this->memory('accepted', ['published_until' => null]);
        $count = DB::table('visitor_memories')->count();
        $updated = DB::table('visitor_memories')->orderBy('id')->pluck('updated_at', 'id')->all();

        $response = $this->getJson('/api/v1/memories?limit=1')->assertOk();
        $this->assertSame([$future], array_column($response->json('data'), 'id'));
        $this->assertFalse($response->json('meta.has_more'));
        $this->assertNotContains($equal, $this->ids());
        $this->assertNotContains($null, $this->ids());

        Carbon::setTestNow($t->copy()->addSeconds(2));
        $this->assertSame([], $this->ids());
        $this->assertFalse($this->getJson('/api/v1/memories')->json('meta.has_more'));

        $this->assertSame($count, DB::table('visitor_memories')->count());
        $this->assertEquals($updated, DB::table('visitor_memories')->orderBy('id')->pluck('updated_at', 'id')->all());
    }
}
