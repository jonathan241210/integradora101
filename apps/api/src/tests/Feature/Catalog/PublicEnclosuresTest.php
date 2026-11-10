<?php

namespace Tests\Feature\Catalog;

use App\Models\Animal;
use App\Models\Enclosure;
use App\Models\Species;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Tests\FeatureTestCase;

class PublicEnclosuresTest extends FeatureTestCase
{
    /** CA-01 public-enclosures-read */
    public function test_ca01_public_enclosures_read_lists_all_enclosures_ordered_with_full_contract(): void
    {
        $first = $this->createEnclosure([
            'name' => 'Recinto Alfa '.Str::random(6),
            'gps_lat' => 20.0825,
            'gps_lon' => -98.3621,
            'map_x' => 0.1505,
            'map_y' => 0.2200,
        ]);

        $second = $this->createEnclosure([
            'name' => 'Recinto Beta '.Str::random(6),
        ]);

        $species = $this->createSpecies(['common_name' => 'Tigre de Bengala']);
        $this->createAnimal($species, $first, [
            'name' => 'Shere Khan',
        ]);

        $response = $this->getJson('/api/v1/enclosures');

        $response->assertOk()->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'gps_lat',
                    'gps_lon',
                    'map_x',
                    'map_y',
                    'animals_count',
                    'animals' => [
                        '*' => [
                            'id',
                            'name',
                            'sex',
                            'age',
                            'origin',
                            'longevity',
                            'diet',
                            'reproduction',
                            'characteristics',
                            'photo_path',
                            'stay_status',
                            'can_receive_visits',
                            'species_id',
                            'species_name',
                            'scientific_name',
                        ],
                    ],
                ],
            ],
        ]);

        $ids = array_column($response->json('data'), 'id');
        $this->assertLessThan(
            array_search($second->id, $ids, true),
            array_search($first->id, $ids, true),
            'Los recintos deben ordenarse por id ascendente.'
        );
    }

    /** CA-02 public-enclosures-read */
    public function test_ca02_public_enclosures_read_shows_existing_enclosure_with_animals(): void
    {
        $enclosure = $this->createEnclosure([
            'name' => 'Aviario Principal '.Str::random(6),
            'gps_lat' => 20.08271,
            'gps_lon' => -98.36235,
            'map_x' => 0.1202,
            'map_y' => 0.0855,
        ]);

        $species = $this->createSpecies(['common_name' => 'Guacamaya Roja']);
        $this->createAnimal($species, $enclosure, [
            'name' => 'Paco',
        ]);

        $this->getJson('/api/v1/enclosures/'.$enclosure->id)
            ->assertOk()
            ->assertJsonPath('data.id', $enclosure->id)
            ->assertJsonPath('data.name', $enclosure->name)
            ->assertJsonPath('data.animals_count', 1)
            ->assertJsonPath('data.animals.0.name', 'Paco')
            ->assertJsonPath('data.animals.0.species_name', 'Guacamaya Roja');
    }

    /** CA-03 public-enclosures-read */
    public function test_ca03_public_enclosures_read_returns_spanish_404_for_missing_or_non_numeric(): void
    {
        $this->getJson('/api/v1/enclosures/999999')
            ->assertNotFound()
            ->assertJson(['message' => 'Recinto no encontrado.']);

        $this->getJson('/api/v1/enclosures/abc')
            ->assertNotFound()
            ->assertJson(['message' => 'Recinto no encontrado.']);

        $this->getJson('/api/v1/enclosures/12-slug')
            ->assertNotFound()
            ->assertJson(['message' => 'Recinto no encontrado.']);
    }

    /** CA-04 public-enclosures-read */
    public function test_ca04_public_enclosures_read_is_accessible_without_authentication(): void
    {
        $enclosure = $this->createEnclosure(['name' => 'Zona Pública '.Str::random(6)]);

        // Sin headers de autenticación ni tokens
        $this->getJson('/api/v1/enclosures')
            ->assertOk();

        $this->getJson('/api/v1/enclosures/'.$enclosure->id)
            ->assertOk();
    }

    /** CA-05 public-enclosures-read */
    public function test_ca05_public_enclosures_read_returns_coordinates_as_floats_or_null(): void
    {
        $withCoords = $this->createEnclosure([
            'name' => 'Con Coordenadas '.Str::random(6),
            'gps_lat' => 20.082123,
            'gps_lon' => -98.362456,
            'map_x' => 0.4507,
            'map_y' => 0.3201,
        ]);

        $withoutCoords = $this->createEnclosure([
            'name' => 'Sin Coordenadas '.Str::random(6),
            'gps_lat' => null,
            'gps_lon' => null,
            'map_x' => null,
            'map_y' => null,
        ]);

        $resWith = $this->getJson('/api/v1/enclosures/'.$withCoords->id)->json('data');
        $this->assertIsFloat($resWith['gps_lat']);
        $this->assertEqualsWithDelta(20.082123, $resWith['gps_lat'], 0.000001);
        $this->assertIsFloat($resWith['gps_lon']);
        $this->assertEqualsWithDelta(-98.362456, $resWith['gps_lon'], 0.000001);
        $this->assertIsFloat($resWith['map_x']);
        $this->assertEqualsWithDelta(0.4507, $resWith['map_x'], 0.0001);
        $this->assertIsFloat($resWith['map_y']);
        $this->assertEqualsWithDelta(0.3201, $resWith['map_y'], 0.0001);

        $resWithout = $this->getJson('/api/v1/enclosures/'.$withoutCoords->id)->json('data');
        $this->assertNull($resWithout['gps_lat']);
        $this->assertNull($resWithout['gps_lon']);
        $this->assertNull($resWithout['map_x']);
        $this->assertNull($resWithout['map_y']);
    }

    private function createEnclosure(array $attributes = []): Enclosure
    {
        return Model::unguarded(fn () => Enclosure::query()->create(array_merge([
            'name' => 'Recinto '.Str::random(8),
        ], $attributes)));
    }

    private function createSpecies(array $attributes = []): Species
    {
        return Model::unguarded(fn () => Species::query()->create(array_merge([
            'common_name' => 'Especie '.Str::random(8),
            'scientific_name' => 'Scientificus test',
            'category' => 'mammal',
            'distribution' => 'México',
            'conservation_status' => 'Preocupación menor',
            'habitat' => 'Selva de prueba',
            'gestation_period' => '90 días',
            'size_cm' => '120',
            'model_3d_path' => 'models/test.glb',
        ], $attributes)));
    }

    private function createAnimal(Species $species, ?Enclosure $enclosure, array $attributes = []): Animal
    {
        return Model::unguarded(fn () => Animal::query()->create(array_merge([
            'species_id' => $species->id,
            'enclosure_id' => $enclosure?->id,
            'name' => 'Animal '.Str::random(6),
            'tag_number' => 'TAG-'.Str::upper(Str::random(6)),
            'responsible_id' => 1,
            'sex' => 'M',
            'entry_date' => now()->toDateString(),
            'stay_status' => 'Permanente',
        ], $attributes)));
    }
}
