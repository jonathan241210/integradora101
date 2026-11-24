<?php

namespace Tests\Feature\Hardening;

use App\Models\Animal;
use App\Models\Enclosure;
use App\Models\Species;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Tests\FeatureTestCase;

/** api-028 · catálogo público sin datos internos (CA-01, CA-02). */
class PublicCatalogHardeningTest extends FeatureTestCase
{
    /** CA-01 pre-delivery-hardening */
    public function test_ca01_catalog_hides_characteristics_and_birth_date_but_keeps_age_and_origin(): void
    {
        $enclosure = $this->createEnclosure();
        $species = $this->createSpecies();
        $this->createAnimal($species, $enclosure, [
            'characteristics' => 'NOTA INTERNA DEL PERSONAL',
            'birth_date' => now()->subYears(3)->toDateString(),
            'origin' => 'Rescate',
        ]);

        $enclosureList = $this->getJson('/api/v1/enclosures')->assertOk();
        $enclosureShow = $this->getJson('/api/v1/enclosures/'.$enclosure->id)->assertOk();
        $speciesList = $this->getJson('/api/v1/species')->assertOk();
        $speciesShow = $this->getJson('/api/v1/species/'.$species->id)->assertOk();

        foreach ([$enclosureList, $enclosureShow, $speciesList, $speciesShow] as $response) {
            $response->assertDontSee('NOTA INTERNA DEL PERSONAL');
        }

        $animal = $enclosureShow->json('data.animals.0');
        $this->assertArrayNotHasKey('characteristics', $animal);
        $this->assertArrayNotHasKey('birth_date', $animal);
        $this->assertSame('3 años', $animal['age']);
        $this->assertSame('Rescate', $animal['origin']);

        $this->assertArrayNotHasKey('characteristics', $speciesShow->json('data'));
        $this->assertArrayNotHasKey('characteristics', collect($speciesList->json('data'))->firstWhere('id', $species->id));
        $this->assertArrayNotHasKey('birth_date', collect($enclosureList->json('data'))->firstWhere('id', $enclosure->id)['animals'][0]);
    }

    /** CA-02 pre-delivery-hardening */
    public function test_ca02_quarantined_animals_are_not_listed_counted_or_representative(): void
    {
        $enclosure = $this->createEnclosure();
        $species = $this->createSpecies();
        $quarantined = $this->createAnimal($species, $enclosure, [
            'name' => 'En cuarentena',
            'stay_status' => 'Cuarentena_Ingreso',
            'photo_path' => 'animals/quarantine.jpg',
        ]);
        $visible = $this->createAnimal($species, $enclosure, ['name' => 'Visible', 'photo_path' => null]);

        $show = $this->getJson('/api/v1/enclosures/'.$enclosure->id)->assertOk();
        $this->assertSame(1, $show->json('data.animals_count'));
        $this->assertSame([$visible->id], array_column($show->json('data.animals'), 'id'));

        $row = collect($this->getJson('/api/v1/enclosures')->json('data'))->firstWhere('id', $enclosure->id);
        $this->assertSame(1, $row['animals_count']);
        $this->assertSame([$visible->id], array_column($row['animals'], 'id'));

        foreach ([
            $this->getJson('/api/v1/species/'.$species->id)->json('data'),
            collect($this->getJson('/api/v1/species')->json('data'))->firstWhere('id', $species->id),
        ] as $item) {
            $this->assertNull($item['photo_path'], 'La foto del ejemplar en cuarentena no es representativa.');
            $this->assertSame($enclosure->name, $item['zone_name']);
        }

        $this->assertNotSame($quarantined->id, $visible->id);
    }

    private function createEnclosure(): Enclosure
    {
        return Model::unguarded(fn () => Enclosure::query()->create(['name' => 'Recinto '.Str::random(8)]));
    }

    private function createSpecies(): Species
    {
        return Species::query()->create([
            'common_name' => 'Especie '.Str::random(8),
            'scientific_name' => 'Hardeningus testus',
        ]);
    }

    private function createAnimal(Species $species, Enclosure $enclosure, array $attributes = []): Animal
    {
        return Animal::query()->create(array_merge([
            'species_id' => $species->id,
            'enclosure_id' => $enclosure->id,
            'name' => 'Animal '.Str::random(6),
            'tag_number' => 'TAG-'.Str::upper(Str::random(8)),
            'responsible_id' => 1,
            'sex' => 'M',
            'entry_date' => now()->toDateString(),
            'stay_status' => 'Permanente',
        ], $attributes));
    }
}
