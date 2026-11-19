<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchRankingTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;
    use BuildsSearchFixtures;

    /** CA-41 enclosure-status-and-global-search */
    public function test_ca41_score_then_title_kind_id(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        // Creados en orden inverso al esperado, para que el orden no sea el de inserción.
        $approximate = $this->makeEnclosure(['name' => 'Lovo '.$tag])->id;
        $contains = $this->makeEnclosure(['name' => 'Pelobo '.$tag])->id;
        $prefix = $this->makeEnclosure(['name' => 'Lobos '.$tag])->id;
        $exact = $this->makeEnclosure(['name' => 'Lobo '.$tag])->id;

        $items = $this->groupsBySection($this->search($admin, 'lobo '.$tag))['enclosures']['items'];
        $this->assertSame([$exact, $prefix, $contains, $approximate], array_column($items, 'id'));

        // A igual puntuación, título normalizado y después id.
        $tag2 = $this->tag();
        $accented = $this->makeEnclosure(['name' => 'Águila '.$tag2])->id;
        $plain = $this->makeEnclosure(['name' => 'Aguila '.$tag2])->id;
        $last = $this->makeEnclosure(['name' => 'Zorro '.$tag2])->id;
        $items = $this->groupsBySection($this->search($admin, $tag2))['enclosures']['items'];
        $this->assertSame([$accented, $plain, $last], array_column($items, 'id'));

        // El elemento toma el peor nivel de sus palabras, aunque su título vaya antes alfabéticamente.
        $tag3 = $this->tag();
        $typo = $this->makeEnclosure(['name' => 'Lobo Zoro '.$tag3])->id;
        $whole = $this->makeEnclosure(['name' => 'Lobo Zorro '.$tag3])->id;
        $items = $this->groupsBySection($this->search($admin, 'lobo zorro '.$tag3))['enclosures']['items'];
        $this->assertSame([$whole, $typo], array_column($items, 'id'));
    }

    /** CA-41 enclosure-status-and-global-search */
    public function test_ca41_tulanpedia_ties_break_by_kind_then_id(): void
    {
        $zooAdmin = $this->createAccount('zoo-admin');
        $tag = $this->tag();
        $speciesId = $this->makeSpeciesId(['common_name' => 'Ocelote '.$tag, 'is_published' => 1]);
        $requestSpecies = $this->makeSpeciesId(['common_name' => 'Ocelote '.$tag]);
        $request = DB::table('species_publication_requests')->insertGetId([
            'species_id' => $requestSpecies, 'request_type' => 'publish', 'published_fields' => '[]',
            'status' => 'submitted', 'created_by' => $zooAdmin->id, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $items = $this->groupsBySection($this->search($zooAdmin, $tag))['tulanpedia']['items'];

        $this->assertSame(['published-species', 'species-request'], array_column($items, 'kind'));
        $this->assertSame([$speciesId, $request], array_column($items, 'id'));
    }
}
