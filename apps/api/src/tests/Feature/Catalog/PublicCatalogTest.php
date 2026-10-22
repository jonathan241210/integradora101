<?php

namespace Tests\Feature\Catalog;

use App\Models\Animal;
use App\Models\Enclosure;
use App\Models\Event;
use App\Models\Species;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\FeatureTestCase;

class PublicCatalogTest extends FeatureTestCase
{
    /** CA-01 public-catalog-read */
    public function test_ca01_public_catalog_read_lists_species_ordered_with_the_full_contract(): void
    {
        $enclosure = $this->createEnclosure(['name' => 'Zona de Prueba '.Str::random(6)]);
        $first = $this->createSpecies(['common_name' => 'AAA '.Str::random(6)]);
        $last = $this->createSpecies(['common_name' => 'ZZZ '.Str::random(6)]);
        $this->createAnimal($first, $enclosure, ['photo_path' => 'https://example.test/aaa.jpg']);

        $response = $this->getJson('/api/v1/species');

        $response->assertOk()->assertJsonStructure([
            'data' => [[
                'id',
                'common_name',
                'scientific_name',
                'category',
                'distribution',
                'conservation_status',
                'habitat',
                'gestation_period',
                'size_cm',
                'model_3d_path',
                'photo_path',
                'longevity',
                'diet',
                'characteristics',
                'zone_name',
            ]],
        ]);

        $ids = array_column($response->json('data'), 'id');
        $this->assertLessThan(
            array_search($last->id, $ids, true),
            array_search($first->id, $ids, true),
            'Las especies deben ordenarse por common_name ascendente.'
        );
    }

    /** CA-02 public-catalog-read */
    public function test_ca02_public_catalog_read_shows_a_species_or_returns_a_spanish_404(): void
    {
        $enclosure = $this->createEnclosure(['name' => 'Zona de Detalle '.Str::random(6)]);
        $species = $this->createSpecies();
        $this->createAnimal($species, $enclosure, [
            'photo_path' => 'https://example.test/detail.jpg',
            'longevity' => '12 años',
            'diet' => 'Carnívoro',
            'characteristics' => 'Pelaje dorado',
        ]);

        $this->getJson('/api/v1/species/'.$species->id)
            ->assertOk()
            ->assertJsonPath('data.id', $species->id)
            ->assertJsonPath('data.photo_path', 'https://example.test/detail.jpg')
            ->assertJsonPath('data.zone_name', $enclosure->name);

        $this->getJson('/api/v1/species/999999')
            ->assertNotFound()
            ->assertJson(['message' => 'Especie no encontrada.']);
    }

    /** CA-03 public-catalog-read */
    public function test_ca03_public_catalog_read_lists_only_active_and_current_events_ordered(): void
    {
        $first = $this->createEvent([
            'name' => 'Evento A '.Str::random(6),
            'start_date' => now()->addDays(2)->toDateString(),
            'end_date' => now()->addDays(3)->toDateString(),
            'start_time' => '09:00:00',
        ]);
        $second = $this->createEvent([
            'name' => 'Evento B '.Str::random(6),
            'start_date' => now()->addDays(2)->toDateString(),
            'end_date' => now()->addDays(3)->toDateString(),
            'start_time' => '11:00:00',
        ]);
        $withoutEnd = $this->createEvent([
            'name' => 'Evento permanente '.Str::random(6),
            'start_date' => now()->addDays(10)->toDateString(),
            'end_date' => null,
        ]);
        $expired = $this->createEvent([
            'name' => 'Evento vencido '.Str::random(6),
            'end_date' => now()->subDay()->toDateString(),
        ]);
        $inactive = $this->createEvent([
            'name' => 'Evento inactivo '.Str::random(6),
            'end_date' => now()->addDays(5)->toDateString(),
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/v1/events')->assertOk();

        $ids = array_column($response->json('data'), 'id');
        $this->assertContains($first->id, $ids);
        $this->assertContains($second->id, $ids);
        $this->assertContains($withoutEnd->id, $ids);
        $this->assertNotContains($expired->id, $ids);
        $this->assertNotContains($inactive->id, $ids);
        $this->assertLessThan(
            array_search($second->id, $ids, true),
            array_search($first->id, $ids, true),
            'Los eventos deben ordenarse por start_date y start_time.'
        );
    }

    /** CA-04 public-catalog-read */
    public function test_ca04_public_catalog_read_hides_finished_or_inactive_events_in_the_detail(): void
    {
        $current = $this->createEvent([
            'end_date' => now()->toDateString(),
        ]);
        $expired = $this->createEvent([
            'end_date' => now()->subDay()->toDateString(),
        ]);
        $inactive = $this->createEvent([
            'end_date' => now()->addDays(5)->toDateString(),
            'is_active' => false,
        ]);

        $this->getJson('/api/v1/events/'.$current->id)
            ->assertOk()
            ->assertJsonPath('data.id', $current->id);

        $this->getJson('/api/v1/events/'.$expired->id)
            ->assertNotFound()
            ->assertJson(['message' => 'Evento no encontrado.']);

        $this->getJson('/api/v1/events/'.$inactive->id)
            ->assertNotFound()
            ->assertJson(['message' => 'Evento no encontrado.']);

        $this->getJson('/api/v1/events/999999')
            ->assertNotFound()
            ->assertJson(['message' => 'Evento no encontrado.']);
    }

    /** CA-05 public-catalog-read */
    public function test_ca05_public_catalog_read_uses_the_representative_animal_and_handles_species_without_animals(): void
    {
        $firstEnclosure = $this->createEnclosure(['name' => 'Zona Uno '.Str::random(6)]);
        $secondEnclosure = $this->createEnclosure(['name' => 'Zona Dos '.Str::random(6)]);
        $species = $this->createSpecies();

        $this->createAnimal($species, $firstEnclosure, [
            'photo_path' => null,
            'longevity' => 'Longevidad del primero',
            'diet' => 'Dieta del primero',
            'characteristics' => 'Características del primero',
        ]);
        $representative = $this->createAnimal($species, $secondEnclosure, [
            'photo_path' => 'https://example.test/representative.jpg',
            'longevity' => 'Longevidad del representante',
            'diet' => 'Dieta del representante',
            'characteristics' => 'Características del representante',
        ]);

        $this->getJson('/api/v1/species/'.$species->id)
            ->assertOk()
            ->assertJsonPath('data.photo_path', $representative->photo_path)
            ->assertJsonPath('data.longevity', 'Longevidad del representante')
            ->assertJsonPath('data.diet', 'Dieta del representante')
            ->assertJsonPath('data.characteristics', 'Características del representante')
            ->assertJsonPath('data.zone_name', $secondEnclosure->name);

        $withoutAnimals = $this->createSpecies();
        $this->getJson('/api/v1/species/'.$withoutAnimals->id)
            ->assertOk()
            ->assertJsonPath('data.photo_path', null)
            ->assertJsonPath('data.longevity', null)
            ->assertJsonPath('data.diet', null)
            ->assertJsonPath('data.characteristics', null)
            ->assertJsonPath('data.zone_name', null);

        $withoutPhotos = $this->createSpecies();
        $this->createAnimal($withoutPhotos, $firstEnclosure, [
            'photo_path' => null,
            'longevity' => 'Primero sin foto',
        ]);
        $this->createAnimal($withoutPhotos, $secondEnclosure, [
            'photo_path' => null,
            'longevity' => 'Segundo sin foto',
        ]);

        $this->getJson('/api/v1/species/'.$withoutPhotos->id)
            ->assertOk()
            ->assertJsonPath('data.longevity', 'Primero sin foto');
    }

    /** CA-06 public-catalog-read */
    public function test_ca06_public_catalog_read_rejects_non_numeric_ids_without_querying_the_database(): void
    {
        DB::flushQueryLog();
        DB::enableQueryLog();

        $this->getJson('/api/v1/species/abc')
            ->assertNotFound()
            ->assertJson(['message' => 'Especie no encontrada.']);
        $this->getJson('/api/v1/events/abc')
            ->assertNotFound()
            ->assertJson(['message' => 'Evento no encontrado.']);

        $this->assertCount(0, DB::getQueryLog(), 'Un ID no numérico no debe consultar la base.');
        DB::disableQueryLog();
    }

    /** CA-07 public-catalog-read */
    public function test_ca07_public_catalog_read_is_anonymous_and_does_not_expose_internal_fields(): void
    {
        $speciesResponse = $this->getJson('/api/v1/species')->assertOk();
        $eventResponse = $this->getJson('/api/v1/events')->assertOk();

        $this->assertSame([], $speciesResponse->headers->getCookies());
        $this->assertSame([], $eventResponse->headers->getCookies());
        $speciesResponse->assertJsonMissingPath('data.0.author_id');
        $speciesResponse->assertJsonMissingPath('data.0.responsible_id');
        $eventResponse->assertJsonMissingPath('data.0.author_id');
    }

    /** CA-08 public-catalog-read */
    public function test_ca08_public_catalog_read_has_a_named_test_per_criterion_and_uses_arca_pruebas(): void
    {
        $this->assertSame('arca_pruebas', DB::getDatabaseName());

        $contents = '';
        foreach (glob(base_path('tests/Feature/Catalog/*.php')) as $file) {
            $contents .= file_get_contents($file);
        }

        foreach (range(1, 7) as $number) {
            $this->assertStringContainsString(
                sprintf('CA-%02d public-catalog-read', $number),
                $contents,
                sprintf('Falta un test que nombre CA-%02d public-catalog-read.', $number)
            );
        }
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

    private function createEnclosure(array $attributes = []): Enclosure
    {
        return Model::unguarded(fn () => Enclosure::query()->create(array_merge([
            'name' => 'Recinto '.Str::random(8),
        ], $attributes)));
    }

    private function createAnimal(Species $species, ?Enclosure $enclosure, array $attributes = []): Animal
    {
        return Model::unguarded(fn () => Animal::query()->create(array_merge([
            'species_id' => $species->id,
            'enclosure_id' => $enclosure?->id,
            'entry_date' => now()->toDateString(),
            'stay_status' => 'Permanente',
        ], $attributes)));
    }

    private function createEvent(array $attributes = []): Event
    {
        return Model::unguarded(fn () => Event::query()->create(array_merge([
            'name' => 'Evento '.Str::random(8),
            'description' => 'Descripción de prueba',
            'image_path' => 'https://example.test/event.jpg',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(7)->toDateString(),
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'location' => 'Ubicación de prueba',
            'is_active' => true,
        ], $attributes)));
    }
}
