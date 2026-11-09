<?php

namespace Tests\Feature\Catalog;

use App\Models\News;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;
use Tests\FeatureTestCase;

class PublicNewsTest extends FeatureTestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /** CA-01 public-news-read */
    public function test_ca01_public_news_read_lists_only_visible_news_without_auth(): void
    {
        $this->isolate();
        $today = now('America/Mexico_City')->toDateString();
        $visible = $this->createNews(['title' => 'Visible']);
        $open = $this->createNews(['title' => 'Sin fin', 'end_date' => null]);
        $this->createNews(['is_active' => false]);
        $this->createNews(['published_date' => now('America/Mexico_City')->addDays(2)->toDateString()]);
        $this->createNews(['end_date' => now('America/Mexico_City')->subDay()->toDateString()]);
        $deleted = $this->createNews();
        $deleted->delete();

        $response = $this->getJson('/api/v1/news');

        $response->assertOk()->assertJsonStructure(['data', 'meta']);
        $ids = array_column($response->json('data'), 'id');
        $this->assertEqualsCanonicalizing([$visible->id, $open->id], $ids);
        $this->assertNotEmpty($today);
    }

    /** CA-02 public-news-read */
    public function test_ca02_public_news_read_orders_by_published_date_desc_then_id_and_returns_empty_data(): void
    {
        $this->isolate();
        $this->getJson('/api/v1/news')->assertOk()->assertExactJson(['data' => [], 'meta' => ['page' => 1, 'limit' => 10, 'has_more' => false]]);

        $old = $this->createNews(['published_date' => '2020-01-01']);
        $sameA = $this->createNews(['published_date' => '2021-01-01']);
        $sameB = $this->createNews(['published_date' => '2021-01-01']);

        $ids = array_column($this->getJson('/api/v1/news')->assertOk()->json('data'), 'id');
        $this->assertSame([$sameB->id, $sameA->id, $old->id], $ids);
    }

    /** CA-03 public-news-read */
    public function test_ca03_public_news_read_paginates_with_limit_page_and_meta(): void
    {
        $this->isolate();
        $created = [];
        for ($i = 1; $i <= 5; $i++) {
            $created[] = $this->createNews(['published_date' => "2021-01-0{$i}"]);
        }
        $desc = array_reverse(array_column($created, 'id'));

        $this->getJson('/api/v1/news?limit=2&page=1')->assertOk()
            ->assertJsonPath('meta', ['page' => 1, 'limit' => 2, 'has_more' => true])
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $desc[0]);
        $this->getJson('/api/v1/news?limit=2&page=3')->assertOk()
            ->assertJsonPath('meta', ['page' => 3, 'limit' => 2, 'has_more' => false])
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $desc[4]);
        $this->getJson('/api/v1/news?limit=2&page=4')->assertOk()
            ->assertExactJson(['data' => [], 'meta' => ['page' => 4, 'limit' => 2, 'has_more' => false]]);
        $this->getJson('/api/v1/news')->assertOk()
            ->assertJsonPath('meta', ['page' => 1, 'limit' => 10, 'has_more' => false])
            ->assertJsonCount(5, 'data');
    }

    /** CA-04 public-news-read */
    public function test_ca04_public_news_read_rejects_invalid_limit_and_page_with_422_in_spanish(): void
    {
        foreach (['abc', '0', '-1', '51', '1.5'] as $limit) {
            $this->getJson('/api/v1/news?limit='.$limit)->assertStatus(422)
                ->assertJsonPath('errors.limit.0', 'El límite debe ser un número entero entre 1 y 50.')
                ->assertJsonPath('message', 'El límite debe ser un número entero entre 1 y 50.');
            $this->getJson('/api/v1/events?limit='.$limit)->assertStatus(422)
                ->assertJsonValidationErrors('limit');
        }
        foreach (['abc', '0', '-3'] as $page) {
            $this->getJson('/api/v1/news?page='.$page)->assertStatus(422)
                ->assertJsonPath('errors.page.0', 'La página debe ser un número entero mayor o igual a 1.');
        }
    }

    /** CA-05 public-news-read */
    public function test_ca05_public_news_read_shows_visible_news_and_returns_spanish_404_otherwise(): void
    {
        $visible = $this->createNews(['content' => 'Contenido completo']);
        $this->getJson('/api/v1/news/'.$visible->id)->assertOk()
            ->assertJsonPath('data.id', $visible->id)
            ->assertJsonPath('data.content', 'Contenido completo');

        $deleted = $this->createNews();
        $deleted->delete();
        $hidden = [
            $this->createNews(['is_active' => false])->id,
            $this->createNews(['published_date' => now('America/Mexico_City')->addDays(2)->toDateString()])->id,
            $this->createNews(['end_date' => now('America/Mexico_City')->subDay()->toDateString()])->id,
            $deleted->id,
            999999999,
        ];
        foreach ($hidden as $id) {
            $this->getJson('/api/v1/news/'.$id)->assertNotFound()->assertExactJson(['message' => 'Noticia no encontrada.']);
        }

        $queries = 0;
        DB::listen(function () use (&$queries) {
            $queries++;
        });
        $this->getJson('/api/v1/news/abc')->assertNotFound()->assertExactJson(['message' => 'Noticia no encontrada.']);
        $this->assertSame(0, $queries);
    }

    /** CA-06 public-news-read */
    public function test_ca06_public_news_read_does_not_expose_internal_fields(): void
    {
        $this->isolate();
        $news = $this->createNews(['content' => 'Detalle', 'author_id' => null, 'image_path' => 'news/'.Str::uuid().'.webp']);
        $forbidden = ['author_id', 'is_active', 'image_path', 'deleted_at'];

        $list = $this->getJson('/api/v1/news')->assertOk()->json('data.0');
        $detail = $this->getJson('/api/v1/news/'.$news->id)->assertOk()->json('data');

        foreach ($forbidden as $field) {
            $this->assertArrayNotHasKey($field, $list);
            $this->assertArrayNotHasKey($field, $detail);
        }
        $this->assertArrayNotHasKey('content', $list);
        $this->assertArrayHasKey('content', $detail);
        $this->assertSame(['id', 'title', 'description', 'category', 'published_date', 'start_date', 'end_date', 'image_url'], array_keys($list));
    }

    /** CA-07 public-news-read */
    public function test_ca07_public_news_read_resolves_image_url_only_for_managed_paths(): void
    {
        $path = 'news/'.Str::uuid().'.png';
        $managed = $this->createNews(['image_path' => $path]);
        $external = $this->createNews(['image_path' => 'https://example.test/x.jpg']);
        $none = $this->createNews(['image_path' => null]);

        $url = $this->getJson('/api/v1/news/'.$managed->id)->assertOk()->json('data.image_url');
        $this->assertStringEndsWith('/storage/'.$path, $url);
        $this->getJson('/api/v1/news/'.$external->id)->assertOk()->assertJsonPath('data.image_url', null);
        $this->getJson('/api/v1/news/'.$none->id)->assertOk()->assertJsonPath('data.image_url', null);
    }

    /** CA-09 public-news-read */
    public function test_ca09_public_news_read_is_read_only_and_writes_no_audit_rows(): void
    {
        $news = $this->createNews();
        $newsCount = News::withTrashed()->count();
        $activityCount = Activity::query()->count();

        $this->getJson('/api/v1/news')->assertOk();
        $this->getJson('/api/v1/news/'.$news->id)->assertOk();
        $this->getJson('/api/v1/news/999999999')->assertNotFound();
        $this->getJson('/api/v1/events?limit=2')->assertOk();

        $this->assertSame($newsCount, News::withTrashed()->count());
        $this->assertSame($activityCount, Activity::query()->count());
        $this->assertNull(News::query()->find($news->id)->deleted_at);
    }

    /** CA-10 public-news-read */
    public function test_ca10_public_news_read_sends_cors_header_only_for_allowed_origin(): void
    {
        config(['cors.allowed_origins' => ['http://localhost:8080']]);
        $news = $this->createNews();

        foreach (['/api/v1/news', '/api/v1/news/'.$news->id] as $uri) {
            $this->withHeaders(['Origin' => 'http://localhost:8080'])->getJson($uri)->assertOk()
                ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
            $response = $this->withHeaders(['Origin' => 'http://127.0.0.1:8080'])->getJson($uri)->assertOk();
            $this->assertNotSame('http://127.0.0.1:8080', $response->headers->get('Access-Control-Allow-Origin'));
        }
    }

    /** CA-11 public-news-read */
    public function test_ca11_public_news_read_has_a_named_test_per_criterion_on_arca_pruebas(): void
    {
        $this->assertSame('arca_pruebas', DB::connection()->getDatabaseName());

        $source = '';
        foreach (glob(__DIR__.'/*.php') as $file) {
            $source .= file_get_contents($file);
        }
        foreach ([...range(1, 10), 12] as $n) {
            $this->assertMatchesRegularExpression(
                sprintf('/function test_ca%02d_public_(news_read|events_limit|visibility)/', $n),
                $source,
                "Falta un test para CA-$n de public-news-read."
            );
        }
        $this->assertContains(DatabaseTransactions::class, class_uses_recursive($this));
        $this->assertNotContains(RefreshDatabase::class, class_uses_recursive($this));
    }

    /** CA-12 public-news-read */
    public function test_ca12_public_visibility_uses_mexico_city_date_for_news(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-07 05:30:00', 'UTC'));
        $this->isolate();

        $endsToday = $this->createNews(['published_date' => '2026-11-01', 'end_date' => '2026-11-06']);
        $expired = $this->createNews(['published_date' => '2026-11-01', 'end_date' => '2026-11-05']);
        $future = $this->createNews(['published_date' => '2026-11-07', 'end_date' => null]);

        $ids = array_column($this->getJson('/api/v1/news')->assertOk()->json('data'), 'id');
        $this->assertSame([$endsToday->id], $ids);
        $this->assertNotContains($expired->id, $ids);
        $this->assertNotContains($future->id, $ids);
        $this->getJson('/api/v1/news/'.$endsToday->id)->assertOk();
        $this->getJson('/api/v1/news/'.$expired->id)->assertNotFound();
        $this->getJson('/api/v1/news/'.$future->id)->assertNotFound();
        $this->assertSame('UTC', config('app.timezone'));
    }

    /** Desactiva dentro de la transacción las noticias existentes para aislar listados. */
    private function isolate(): void
    {
        News::query()->update(['is_active' => false]);
    }

    private function createNews(array $attributes = []): News
    {
        $today = now('America/Mexico_City');

        return Model::unguarded(fn () => News::query()->create(array_merge([
            'title' => 'Noticia '.Str::random(8),
            'description' => 'Descripción de prueba',
            'content' => 'Contenido de prueba',
            'category' => 'Aviso',
            'published_date' => $today->copy()->subDay()->toDateString(),
            'start_date' => null,
            'end_date' => $today->copy()->addDays(7)->toDateString(),
            'is_active' => true,
        ], $attributes)));
    }
}
