<?php

namespace Tests\Feature\Catalog;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\FeatureTestCase;

/**
 * api-031 published-species-model-3d-url. Extends api-015 contract with model_3d_url.
 */
class PublishedSpeciesModel3dTest extends FeatureTestCase
{
    private const URL = '/api/v1/published-species';

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::table('species')->where('is_published', 1)->exists()) {
            DB::table('species')->where('is_published', 1)->update(['is_published' => 0]);
        }
    }

    /** CA-01 */
    public function test_ca01_published_species_includes_model_3d_url(): void
    {
        $this->species(['model_3d_path' => null]);

        $item = $this->getJson(self::URL)->assertOk()->json('data.0');

        $this->assertArrayHasKey('model_3d_url', $item);
        $this->assertNull($item['model_3d_url']);
    }

    /** CA-02 */
    public function test_ca02_model_3d_url_resolves_valid_glb(): void
    {
        config(['filesystems.media_scopes.public' => 'media']);
        Storage::fake('media', ['url' => 'http://localhost/media']);
        Storage::disk('media')->put('models/jaguar.glb', 'glb');

        $this->species(['model_3d_path' => 'models/jaguar.glb']);

        $item = $this->getJson(self::URL)->assertOk()->json('data.0');

        $this->assertSame('/media/models/jaguar.glb', $item['model_3d_url']);
    }

    /** CA-03 */
    public function test_ca03_model_3d_url_null_for_invalid_or_missing(): void
    {
        config(['filesystems.media_scopes.public' => 'media']);
        Storage::fake('media', ['url' => 'http://localhost/media']);
        Storage::disk('media')->put('models/ok.glb', 'glb');

        $ids = [];
        $ids['ok'] = $this->species(['common_name' => 'A', 'model_3d_path' => 'models/ok.glb']);
        $ids['missing'] = $this->species(['common_name' => 'B', 'model_3d_path' => 'models/missing.glb']);
        $ids['empty'] = $this->species(['common_name' => 'C', 'model_3d_path' => '']);
        $ids['null'] = $this->species(['common_name' => 'D', 'model_3d_path' => null]);
        $ids['not_glb'] = $this->species(['common_name' => 'E', 'model_3d_path' => 'models/file.png']);

        $data = collect($this->getJson(self::URL)->assertOk()->json('data'))->keyBy('id');

        $this->assertSame('/media/models/ok.glb', $data[$ids['ok']]['model_3d_url']);
        $this->assertNull($data[$ids['missing']]['model_3d_url']);
        $this->assertNull($data[$ids['empty']]['model_3d_url']);
        $this->assertNull($data[$ids['null']]['model_3d_url']);
        $this->assertNull($data[$ids['not_glb']]['model_3d_url']);
    }

    /** CA-04 */
    public function test_ca04_model_3d_url_rejects_unsafe_paths(): void
    {
        config(['filesystems.media_scopes.public' => 'media']);
        Storage::fake('media', ['url' => 'http://localhost/media']);
        Storage::disk('media')->put('models/safe.glb', 'glb');

        $cases = [
            '../secret.glb',
            'models/../secret.glb',
            'models\\safe.glb',
            '/models/safe.glb',
            'species/safe.glb',
            'https://evil.test/model.glb',
        ];

        foreach ($cases as $i => $path) {
            $this->species(['common_name' => 'Case'.$i, 'model_3d_path' => $path]);
        }

        $data = $this->getJson(self::URL)->assertOk()->json('data');
        foreach ($data as $item) {
            $this->assertNull($item['model_3d_url'], 'Path should be rejected: '.json_encode($item));
        }
    }

    /** CA-05 */
    public function test_ca05_existing_published_species_fields_keep_semantics(): void
    {
        $id = $this->species([
            'common_name' => 'Jaguar',
            'scientific_name' => 'Panthera onca',
            'category' => 'mammal',
            'distribution' => 'Mexico',
            'habitat' => 'Selva',
            'published_fields' => ['scientific_name', 'origin', 'habitat'],
        ]);

        $item = collect($this->getJson(self::URL)->assertOk()->json('data'))->firstWhere('id', $id);

        $this->assertSame('Jaguar', $item['common_name']);
        $this->assertSame('mammal', $item['category']);
        $this->assertSame('Panthera onca', $item['scientific_name']);
        $this->assertSame('Mexico', $item['origin']);
        $this->assertSame('Selva', $item['habitat']);
        $this->assertArrayHasKey('image_url', $item);
        $this->assertArrayHasKey('model_3d_url', $item);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function species(array $attributes = []): int
    {
        $attributes = array_merge([
            'common_name' => 'Especie '.Str::random(8),
            'is_published' => 1,
            'published_fields' => ['scientific_name', 'origin', 'habitat'],
        ], $attributes);

        if (is_array($attributes['published_fields'])) {
            $attributes['published_fields'] = json_encode($attributes['published_fields']);
        }

        return DB::table('species')->insertGetId($attributes);
    }
}
