<?php

namespace Tests\Feature;

use App\Models\Enclosure;
use App\Models\Species;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class AnimalRegistrationTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-03, CA-04 animal-registration */
    public function test_ca03_ca04_animal_registration_requires_and_persists_a_valid_enclosure(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $enclosure = Enclosure::query()->create([
            'name' => 'Recinto de prueba '.bin2hex(random_bytes(5)),
        ]);
        $payload = [
            'name' => 'Animal de prueba',
            'species' => 'Especie de prueba '.bin2hex(random_bytes(5)),
            'tag_number' => 'TEST-'.bin2hex(random_bytes(5)),
            'sex' => 'hembra',
        ];

        $this->actingAs($staff, 'web')
            ->postJson('/api/v1/staff/animals', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('enclosure_id');

        $payload['enclosure_id'] = PHP_INT_MAX;
        $this->actingAs($staff, 'web')
            ->postJson('/api/v1/staff/animals', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('enclosure_id');

        $payload['enclosure_id'] = $enclosure->id;
        $response = $this->actingAs($staff, 'web')
            ->postJson('/api/v1/staff/animals', $payload)
            ->assertCreated();

        $this->assertDatabaseHas('animals', [
            'id' => $response->json('data.id'),
            'tag_number' => $payload['tag_number'],
            'enclosure_id' => $enclosure->id,
        ]);
    }

    /** CA-01, CA-02 animal-registration */
    public function test_ca01_ca02_animal_registration_accepts_existing_or_new_species_and_persists_birth_date(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $enclosure = Enclosure::query()->create([
            'name' => 'Recinto especies '.bin2hex(random_bytes(5)),
        ]);

        $existing = Species::query()->create([
            'common_name' => 'Especie existente '.bin2hex(random_bytes(5)),
            'scientific_name' => 'Scientifica existens',
        ]);

        $payloadExisting = [
            'name' => 'Animal con especie existente',
            'species_id' => $existing->id,
            'tag_number' => 'TEST-EX-'.bin2hex(random_bytes(5)),
            'enclosure_id' => $enclosure->id,
            'sex' => 'macho',
            'birth_date' => '2022-03-10',
            'origin' => 'rescue',
            'notes' => 'Observación de prueba',
        ];

        $responseExisting = $this->actingAs($staff, 'web')
            ->postJson('/api/v1/staff/animals', $payloadExisting)
            ->assertCreated()
            ->assertJsonMissingPath('data.estimated_age');

        $this->assertDatabaseHas('animals', [
            'id' => $responseExisting->json('data.id'),
            'tag_number' => $payloadExisting['tag_number'],
            'species_id' => $existing->id,
            'enclosure_id' => $enclosure->id,
            'birth_date' => '2022-03-10',
            'characteristics' => 'Observación de prueba',
        ]);

        $newSpeciesName = 'Especie nueva '.bin2hex(random_bytes(5));
        $payloadNew = [
            'name' => 'Animal con especie nueva',
            'species' => $newSpeciesName,
            'tag_number' => 'TEST-NW-'.bin2hex(random_bytes(5)),
            'enclosure_id' => $enclosure->id,
            'sex' => 'hembra',
        ];

        $responseNew = $this->actingAs($staff, 'web')
            ->postJson('/api/v1/staff/animals', $payloadNew)
            ->assertCreated()
            ->assertJsonMissingPath('data.estimated_age');

        $createdAnimalId = $responseNew->json('data.id');
        $this->assertDatabaseHas('species', ['common_name' => $newSpeciesName]);
        $createdSpecies = Species::query()->where('common_name', $newSpeciesName)->first();
        $this->assertNotNull($createdSpecies);
        $this->assertDatabaseHas('animals', [
            'id' => $createdAnimalId,
            'tag_number' => $payloadNew['tag_number'],
            'species_id' => $createdSpecies->id,
        ]);
    }

    /** CA-05 animal-registration */
    public function test_ca05_animal_profile_exposes_species_data_and_birth_fields(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $enclosure = Enclosure::query()->create([
            'name' => 'Recinto perfil '.bin2hex(random_bytes(5)),
        ]);
        $species = Species::query()->create([
            'common_name' => 'Especie perfil '.bin2hex(random_bytes(5)),
            'scientific_name' => 'Perfilus testus',
            'feeding' => 'Frutas y hojas',
            'longevity' => '20 años',
            'reproduction' => '1 cría por camada',
        ]);

        $create = $this->actingAs($staff, 'web')
            ->postJson('/api/v1/staff/animals', [
                'name' => 'Animal perfil',
                'species_id' => $species->id,
                'tag_number' => 'TEST-PF-'.bin2hex(random_bytes(5)),
                'enclosure_id' => $enclosure->id,
                'sex' => 'hembra',
                'birth_date' => '2020-01-15',
            ])
            ->assertCreated();

        $animalId = $create->json('data.id');

        $this->actingAs($staff, 'web')
            ->getJson("/api/v1/staff/animals/{$animalId}")
            ->assertOk()
            ->assertJsonPath('data.birth_date', '2020-01-15')
            ->assertJsonPath('data.species.common_name', $species->common_name)
            ->assertJsonPath('data.species.feeding', 'Frutas y hojas')
            ->assertJsonPath('data.species.longevity', '20 años')
            ->assertJsonPath('data.species.reproduction', '1 cría por camada');
    }
}
