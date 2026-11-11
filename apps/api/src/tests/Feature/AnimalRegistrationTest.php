<?php

namespace Tests\Feature;

use App\Models\Enclosure;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class AnimalRegistrationTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-03 animal-registration */
    public function test_ca03_animal_registration_requires_and_persists_a_valid_enclosure(): void
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
}
