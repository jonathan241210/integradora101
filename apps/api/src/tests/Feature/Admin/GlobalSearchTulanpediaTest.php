<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchTulanpediaTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;
    use BuildsSearchFixtures;

    private function makeRequest(int $speciesId, int $createdBy, string $status): int
    {
        return DB::table('species_publication_requests')->insertGetId([
            'species_id' => $speciesId,
            'request_type' => 'publish',
            'published_fields' => '[]',
            'status' => $status,
            'created_by' => $createdBy,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** CA-30 enclosure-status-and-global-search */
    public function test_ca30_tulanpedia_published_and_submitted_with_kind(): void
    {
        $zooAdmin = $this->createAccount('zoo-admin');
        $tag = $this->tag();

        $published = $this->makeSpeciesId(['common_name' => 'A '.$tag, 'is_published' => 1]);
        $this->makeSpeciesId(['common_name' => 'N '.$tag, 'is_published' => 0]);
        $this->makeSpeciesId(['common_name' => 'D '.$tag, 'is_published' => 1, 'deleted_at' => now()]);
        $submittedSpecies = $this->makeSpeciesId(['common_name' => 'B '.$tag]);
        $submitted = $this->makeRequest($submittedSpecies, $zooAdmin->id, 'submitted');
        $this->makeRequest($this->makeSpeciesId(['common_name' => 'C '.$tag]), $zooAdmin->id, 'accepted');
        $this->makeRequest($this->makeSpeciesId(['common_name' => 'E '.$tag]), $zooAdmin->id, 'draft');

        $items = $this->groupsBySection($this->search($zooAdmin, $tag))['tulanpedia']['items'];

        $this->assertSame([
            ['id' => $published, 'title' => 'A '.$tag, 'subtitle' => 'Publicada', 'kind' => 'published-species'],
            ['id' => $submitted, 'title' => 'B '.$tag, 'subtitle' => 'Solicitud · Enviada', 'kind' => 'species-request'],
        ], $items);

        // Máximo 5 en total y sin permiso no aparece.
        foreach (['F', 'G', 'H', 'I', 'J'] as $letter) {
            $this->makeSpeciesId(['common_name' => $letter.' '.$tag, 'is_published' => 1]);
        }
        $this->assertCount(5, $this->groupsBySection($this->search($zooAdmin, $tag))['tulanpedia']['items']);
        $this->assertArrayNotHasKey('tulanpedia', $this->groupsBySection($this->search($this->createAccount('admin'), $tag)));

        // Campos de la especie (CA-30, CA-43), también para las solicitudes `submitted`.
        $other = $this->tag();
        $species = $this->makeSpeciesId(['common_name' => 'Zorro '.$this->tag(), 'is_published' => 1, 'habitat' => 'Bosque '.$other]);
        $requestSpecies = $this->makeSpeciesId(['common_name' => 'Zorra '.$this->tag(), 'distribution' => 'Sierra '.$other]);
        $request = $this->makeRequest($requestSpecies, $zooAdmin->id, 'submitted');
        $items = collect($this->groupsBySection($this->search($zooAdmin, $other))['tulanpedia']['items'])->keyBy(fn (array $item) => $item['kind'].':'.$item['id']);
        $this->assertSame('Hábitat', $items['published-species:'.$species]['match']['field']);
        $this->assertSame('Distribución', $items['species-request:'.$request]['match']['field']);
    }
}
