<?php

namespace Tests\Feature\Catalog;

use App\Http\Controllers\Catalog\PublishedSpeciesController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\FeatureTestCase;

/**
 * api-015 public-species-read. Fixtures use DB::table inside DatabaseTransactions on arca_pruebas.
 */
class PublishedSpeciesTest extends FeatureTestCase
{
    private const DEFAULT_FIELDS = ['scientific_name', 'origin', 'habitat'];

    private const URL = '/api/v1/published-species';

    protected function setUp(): void
    {
        parent::setUp();

        // Inside the transaction: hide species that other sessions may have published.
        if (DB::table('species')->where('is_published', 1)->exists()) {
            DB::table('species')->where('is_published', 1)->update(['is_published' => 0]);
        }
    }

    /** CA-01 */
    public function test_ca01_only_published_species_are_listed(): void
    {
        $published = $this->species(['common_name' => 'Publicada']);
        $submitted = $this->species(['is_published' => 0]);
        $this->request($submitted, 'publish', 'submitted');
        $rejected = $this->species(['is_published' => 0]);
        $this->request($rejected, 'publish', 'rejected');
        $this->species(['is_published' => 0]);
        $unpublished = $this->species(['is_published' => 0, 'unpublished_at' => now()]);
        $this->request($unpublished, 'update', 'submitted');
        $this->species(['is_published' => 0, 'image_path' => null, 'published_fields' => null]);
        $this->species(['deleted_at' => now()]);

        $response = $this->getJson(self::URL)->assertOk();

        $this->assertSame([$published], array_column($response->json('data'), 'id'));
    }

    /** CA-02 */
    public function test_ca02_orders_by_common_name_and_returns_empty_list(): void
    {
        $this->getJson(self::URL)->assertOk()->assertExactJson(['data' => []]);

        $b1 = $this->species(['common_name' => 'Beta']);
        $b2 = $this->species(['common_name' => 'Beta']);
        $a = $this->species(['common_name' => 'Alfa']);

        $ids = array_column($this->getJson(self::URL)->assertOk()->json('data'), 'id');
        $this->assertSame([$a, $b1, $b2], $ids);
        $this->assertArrayNotHasKey('meta', $this->getJson(self::URL)->json());
    }

    /** CA-03 */
    public function test_ca03_public_fields_only(): void
    {
        $this->species([
            'common_name' => 'Jaguar',
            'category' => null,
            'scientific_name' => 'Panthera onca',
            'distribution' => 'Mexico',
            'habitat' => 'Selva',
            'image_path' => 'species/a.jpg',
            'published_at' => now(),
        ]);

        $item = $this->getJson(self::URL)->assertOk()->json('data.0');

        $this->assertSame(
            ['id', 'common_name', 'category', 'image_url', 'scientific_name', 'origin', 'habitat'],
            array_keys($item)
        );
        $this->assertNull($item['category']);
        $this->assertNull($item['image_url']);
        $this->assertSame('Mexico', $item['origin']);
        foreach (['is_published', 'published_at', 'published_fields', 'image_path', 'created_by', 'reviewed_by',
            'reviewed_at', 'rejection_reason', 'species_request_id'] as $key) {
            $this->assertArrayNotHasKey($key, $item);
        }
    }

    /** CA-04 */
    public function test_ca04_habitat_filter_matches_normalized_value(): void
    {
        $id = $this->species(['common_name' => 'Jaguar', 'habitat' => 'Selva']);
        $this->species(['common_name' => 'Otro', 'habitat' => 'Desierto']);

        $this->assertSame([$id], $this->ids('?habitat=%20%20Selva%20%20'));
        $this->assertSame([$id], $this->ids('?habitat=selva'));
        $this->assertSame([], $this->ids('?habitat='.urlencode('Sélva')));
        $this->getJson(self::URL.'?habitat=Mar')->assertOk()->assertExactJson(['data' => []]);
        $this->getJson(self::URL.'?habitat=')->assertStatus(422);
        $this->getJson(self::URL.'?habitat=%20%20')->assertStatus(422);
        $this->getJson(self::URL.'?habitat='.str_repeat('a', 151))->assertStatus(422);
    }

    /** CA-05 */
    public function test_ca05_name_filter_is_literal_and_case_insensitive(): void
    {
        $jaguar = $this->species(['common_name' => 'Jaguar']);
        $percent = $this->species(['common_name' => '100% Fauna']);
        $under = $this->species(['common_name' => 'Gato_Negro']);
        $this->species(['common_name' => 'Gato Montes']);

        $this->assertSame([$jaguar], $this->ids('?name=JAG'));
        $this->assertSame([$percent], $this->ids('?name=%25'));
        $this->assertSame([$under], $this->ids('?name=_'));
        $this->assertSame([], $this->ids('?name='.urlencode('Jaguár')));
        $this->getJson(self::URL.'?name=')->assertStatus(422);
        $this->getJson(self::URL.'?name=%20%20')->assertStatus(422);
        $this->getJson(self::URL.'?name='.str_repeat('a', 151))->assertStatus(422);
    }

    /** CA-06 */
    public function test_ca06_filters_combine_with_and(): void
    {
        $match = $this->species(['common_name' => 'Jaguar', 'habitat' => 'Selva', 'category' => 'mammal']);
        $this->species(['common_name' => 'Jaguar azul', 'habitat' => 'Selva', 'category' => 'bird']);
        $this->species(['common_name' => 'Jaguar rojo', 'habitat' => 'Desierto', 'category' => 'mammal']);
        $this->species(['common_name' => 'Tigre', 'habitat' => 'Selva', 'category' => 'mammal']);

        $this->assertSame([$match], $this->ids('?habitat=selva&name=jag&category=mammal'));
        $this->assertCount(4, $this->ids(''));
        $this->assertSame($this->ids(''), $this->ids('?foo=bar'));
    }

    /** CA-07 */
    public function test_ca07_invalid_filters_return_422_in_spanish(): void
    {
        $before = DB::table('species')->count();
        $cases = [
            ['?habitat=', 'habitat', 'El hábitat debe tener de 1 a 150 caracteres.'],
            ['?habitat[]=x', 'habitat', 'El hábitat debe tener de 1 a 150 caracteres.'],
            ['?habitat='.str_repeat('a', 151), 'habitat', 'El hábitat debe tener de 1 a 150 caracteres.'],
            ['?name=%20', 'name', 'El nombre debe tener de 1 a 150 caracteres.'],
            ['?name='.str_repeat('a', 151), 'name', 'El nombre debe tener de 1 a 150 caracteres.'],
            ['?category=dragon', 'category', 'Tipo de animal no válido.'],
        ];

        foreach ($cases as [$query, $key, $message]) {
            $this->getJson(self::URL.$query)
                ->assertStatus(422)
                ->assertJsonPath('message', $message)
                ->assertJsonPath("errors.$key.0", $message);
        }
        $this->assertSame($before, DB::table('species')->count());
    }

    /** CA-08 */
    public function test_ca08_image_url_only_from_species_folder(): void
    {
        config(['filesystems.media_scopes.public' => 'media']);
        Storage::fake('media', ['url' => 'http://localhost/media']);
        Storage::disk('media')->put('species/ok.jpg', 'x');
        Storage::disk('media')->put('species-requests/req.jpg', 'x');

        $ok = $this->species(['common_name' => 'A', 'image_path' => 'species/ok.jpg']);
        $none = $this->species(['common_name' => 'B', 'image_path' => null]);
        $missing = $this->species(['common_name' => 'C', 'image_path' => 'species/missing.jpg']);
        $req = $this->species(['common_name' => 'D', 'image_path' => 'species-requests/req.jpg']);

        $data = collect($this->getJson(self::URL)->assertOk()->json('data'))->keyBy('id');

        $this->assertSame('http://localhost/media/species/ok.jpg', $data[$ok]['image_url']);
        $this->assertNull($data[$none]['image_url']);
        $this->assertNull($data[$missing]['image_url']);
        $this->assertNull($data[$req]['image_url']);
        $this->assertStringNotContainsString('species-requests', $this->getJson(self::URL)->getContent());
    }

    /** CA-09 */
    public function test_ca09_read_only_without_session_and_without_activitylog(): void
    {
        $this->species();
        $species = DB::table('species')->count();
        $logs = DB::table('activity_log')->count();

        $this->getJson(self::URL)->assertOk();
        $this->getJson(self::URL.'?habitat=')->assertStatus(422);

        $this->assertSame($species, DB::table('species')->count());
        $this->assertSame($logs, DB::table('activity_log')->count());
    }

    /** CA-10 */
    public function test_ca10_cors_allows_only_configured_origin(): void
    {
        config(['cors.allowed_origins' => ['http://localhost:8080']]);

        $this->getJson(self::URL, ['Origin' => 'http://localhost:8080'])
            ->assertOk()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:8080');

        // Fresh request cycle: the HandleCors middleware instance is shared within one test.
        $response = $this->getJson(self::URL, ['Origin' => 'http://127.0.0.1:8080'])->assertOk();
        $this->assertNotSame('http://127.0.0.1:8080', $response->headers->get('Access-Control-Allow-Origin'));
    }

    /** CA-11 */
    public function test_ca11_route_name_and_thin_controller(): void
    {
        $route = Route::getRoutes()->getByName('published-species.index');

        $this->assertNotNull($route);
        $this->assertStringEndsWith('/api/v1/published-species', route('published-species.index'));
        $this->assertContains('GET', $route->methods());
        foreach ($route->gatherMiddleware() as $middleware) {
            $this->assertStringNotContainsString('auth', (string) $middleware);
        }

        $source = file_get_contents((new \ReflectionClass(PublishedSpeciesController::class))->getFileName());
        $this->assertStringNotContainsString('where(', $source);
        $this->assertStringNotContainsString('Species::', $source);
        $this->assertStringNotContainsString('is_published', $source);
        $this->assertStringContainsString('ListPublishedSpeciesAction', $source);
        $this->assertStringContainsString('PublishedSpeciesResource', $source);
    }

    /** CA-13 */
    public function test_ca13_published_fields_select_response_keys(): void
    {
        $base = ['common_name' => 'Jaguar', 'scientific_name' => 'P. onca', 'distribution' => 'Mexico', 'habitat' => 'Selva',
            'conservation_status' => 'NT', 'size_cm' => 150, 'gestation_period' => '100 dias', 'longevity' => '20'];

        $a = $this->species($base);
        $item = collect($this->getJson(self::URL)->json('data'))->firstWhere('id', $a);
        $this->assertSame(['id', 'common_name', 'category', 'image_url', 'scientific_name', 'origin', 'habitat'], array_keys($item));
        foreach (['conservation_status', 'size_cm', 'gestation_period', 'diet', 'longevity', 'characteristics'] as $key) {
            $this->assertArrayNotHasKey($key, $item);
        }
        DB::table('species')->where('id', $a)->update(['is_published' => 0]);

        $b = $this->species($base + ['published_fields' => ['scientific_name', 'habitat', 'diet']]);
        $item = collect($this->getJson(self::URL)->json('data'))->firstWhere('id', $b);
        $this->assertArrayNotHasKey('origin', $item);
        $this->assertArrayNotHasKey('diet', $item);
        $this->assertArrayHasKey('habitat', $item);
        DB::table('species')->where('id', $b)->update(['is_published' => 0]);

        $c = $this->species($base + ['published_fields' => []]);
        $item = collect($this->getJson(self::URL)->json('data'))->firstWhere('id', $c);
        $this->assertSame(['id', 'common_name', 'category', 'image_url'], array_keys($item));
        DB::table('species')->where('id', $c)->update(['is_published' => 0]);

        // NULL published_fields with is_published = 1 behaves as an empty list.
        $d = $this->species(['common_name' => 'Nulo', 'habitat' => 'Selva', 'published_fields' => null]);
        $item = collect($this->getJson(self::URL)->json('data'))->firstWhere('id', $d);
        $this->assertSame(['id', 'common_name', 'category', 'image_url'], array_keys($item));
    }

    /** CA-14 */
    public function test_ca14_habitat_filter_ignores_unpublished_habitat(): void
    {
        $hidden = $this->species(['common_name' => 'Oculto', 'habitat' => 'Selva', 'published_fields' => ['scientific_name']]);
        $shown = $this->species(['common_name' => 'Visible', 'habitat' => 'Selva']);

        $this->assertSame([$shown], $this->ids('?habitat=Selva'));
        DB::table('species')->where('id', $shown)->update(['is_published' => 0]);
        $this->getJson(self::URL.'?habitat=Selva')->assertOk()->assertExactJson(['data' => []]);
        $this->assertSame([$hidden], $this->ids('?name=oculto'));
    }

    /** CA-15 */
    public function test_ca15_category_filter_returns_only_matching_species(): void
    {
        $byCategory = [];
        foreach (['mammal', 'bird', 'reptile', 'amphibian', 'fish', 'invertebrate'] as $category) {
            $byCategory[$category] = $this->species(['common_name' => ucfirst($category), 'category' => $category]);
        }
        $null = $this->species(['common_name' => 'Sin categoria', 'category' => null]);

        foreach ($byCategory as $category => $id) {
            $this->assertSame([$id], $this->ids('?category='.$category));
        }
        $this->assertNotContains($null, $this->ids('?category=mammal'));

        DB::table('species')->whereIn('id', array_values($byCategory))->update(['is_published' => 0]);
        $this->getJson(self::URL.'?category=fish')->assertOk()->assertExactJson(['data' => []]);
    }

    /** CA-16 */
    public function test_ca16_invalid_category_returns_422_in_spanish(): void
    {
        foreach (['?category=dragon', '?category=', '?category=%20%20', '?category=Mammal2'] as $query) {
            $this->getJson(self::URL.$query)
                ->assertStatus(422)
                ->assertJsonPath('message', 'Tipo de animal no válido.')
                ->assertJsonPath('errors.category.0', 'Tipo de animal no válido.');
        }
    }

    /** CA-17 */
    public function test_ca17_pending_update_keeps_published_version(): void
    {
        Storage::fake('media', ['url' => 'http://localhost/media']);
        config(['filesystems.media_scopes.public' => 'media']);
        Storage::disk('media')->put('species/pub.jpg', 'x');

        $id = $this->species(['common_name' => 'Jaguar', 'habitat' => 'Selva', 'image_path' => 'species/pub.jpg']);
        $this->request($id, 'update', 'submitted', ['habitat' => 'Cambiado', 'image_path' => 'species-requests/new.jpg']);

        $item = $this->getJson(self::URL)->assertOk()->json('data.0');

        $this->assertSame($id, $item['id']);
        $this->assertSame('Selva', $item['habitat']);
        $this->assertSame('http://localhost/media/species/pub.jpg', $item['image_url']);
    }

    /** CA-18 */
    public function test_ca18_unpublished_or_deleted_species_are_hidden_even_with_live_request(): void
    {
        Storage::fake('media', ['url' => 'http://localhost/media']);
        config(['filesystems.media_scopes.public' => 'media']);
        Storage::disk('media')->put('species/pub.jpg', 'x');

        $id = $this->species(['common_name' => 'Jaguar', 'habitat' => 'Selva', 'image_path' => 'species/pub.jpg']);
        $this->request($id, 'update', 'submitted');

        DB::table('species')->where('id', $id)->update(['is_published' => 0, 'unpublished_at' => now()]);
        $this->assertSame([], $this->ids(''));

        DB::table('species')->where('id', $id)->update(['is_published' => 1, 'unpublished_at' => null]);
        $item = $this->getJson(self::URL)->assertOk()->json('data.0');
        $this->assertSame('http://localhost/media/species/pub.jpg', $item['image_url']);
        $this->assertSame('Selva', $item['habitat']);

        DB::table('species')->where('id', $id)->update(['is_published' => 0, 'image_path' => null, 'published_fields' => null]);
        $this->assertSame([], $this->ids(''));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function species(array $attributes = []): int
    {
        $attributes = array_merge([
            'common_name' => 'Especie '.Str::random(8),
            'is_published' => 1,
            'published_fields' => self::DEFAULT_FIELDS,
        ], $attributes);

        if (is_array($attributes['published_fields'])) {
            $attributes['published_fields'] = json_encode($attributes['published_fields']);
        }

        return DB::table('species')->insertGetId($attributes);
    }

    /**
     * @param  array<string, mixed>  $proposed
     */
    private function request(int $speciesId, string $type, string $status, array $proposed = []): void
    {
        DB::table('species_publication_requests')->insert(array_merge([
            'species_id' => $speciesId,
            'request_type' => $type,
            'published_fields' => json_encode(self::DEFAULT_FIELDS),
            'status' => $status,
            'created_by' => DB::table('users')->value('id'),
            'created_at' => now(),
            'updated_at' => now(),
        ], $proposed));
    }

    /**
     * @return array<int, int>
     */
    private function ids(string $query): array
    {
        return array_column($this->getJson(self::URL.$query)->assertOk()->json('data'), 'id');
    }
}
