<?php

namespace Tests\Feature\Catalog;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\FeatureTestCase;

class PublishedSpeciesFunFactTest extends FeatureTestCase
{
    private const URL = '/api/v1/published-species';

    protected function setUp(): void
    {
        parent::setUp();

        DB::table('species')->where('is_published', 1)->update(['is_published' => 0]);
    }

    private function species(array $fields, ?string $funFact, array $extra = []): int
    {
        return DB::table('species')->insertGetId(array_merge([
            'common_name' => 'Especie '.Str::random(8),
            'is_published' => 1,
            'published_fields' => json_encode($fields),
            'fun_fact' => $funFact,
        ], $extra));
    }

    /** CA-11 species-fun-fact se publica solo si está seleccionado y la especie es visible */
    public function test_ca11_public_returns_fun_fact_only_when_selected_and_visible(): void
    {
        $selected = $this->species(['habitat', 'fun_fact'], 'Dato curioso visible al público.');
        $nullValue = $this->species(['fun_fact'], null);
        $notSelected = $this->species(['habitat'], 'Dato curioso que no se publica.');
        $this->species(['fun_fact'], 'Dato de una especie oculta.', ['is_published' => 0]);

        $response = $this->getJson(self::URL.'?fun_fact=zzz')->assertOk();
        $rows = collect($response->json('data'))->keyBy('id');

        $this->assertSame('Dato curioso visible al público.', $rows[$selected]['fun_fact']);
        $this->assertArrayHasKey('fun_fact', $rows[$nullValue]);
        $this->assertNull($rows[$nullValue]['fun_fact']);
        $this->assertArrayNotHasKey('fun_fact', $rows[$notSelected]);
        $this->assertCount(3, $rows);
        $this->assertStringNotContainsString('oculta', $response->getContent());
    }

    /** CA-12 species-fun-fact durante una actualización pendiente se ve la versión publicada */
    public function test_ca12_public_fun_fact_keeps_published_version_during_pending_update(): void
    {
        $id = $this->species(['fun_fact'], 'Versión publicada del dato curioso.');
        DB::table('species_publication_requests')->insert([
            'species_id' => $id,
            'request_type' => 'update',
            'published_fields' => json_encode(['fun_fact']),
            'fun_fact' => 'Versión propuesta pendiente de revisión.',
            'status' => 'submitted',
            'created_by' => DB::table('users')->value('id'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row = collect($this->getJson(self::URL)->assertOk()->json('data'))->firstWhere('id', $id);
        $this->assertSame('Versión publicada del dato curioso.', $row['fun_fact']);
    }
}
