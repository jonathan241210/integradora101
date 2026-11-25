<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\Enclosure;
use App\Models\Species;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class AnimalStatusUpdateTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    private function makeAnimal(array $overrides = []): Animal
    {
        $enclosure = Enclosure::query()->create(['name' => 'Recinto '.bin2hex(random_bytes(4))]);
        $species = Species::query()->create(['common_name' => 'Especie '.bin2hex(random_bytes(4))]);

        return Animal::query()->create(array_merge([
            'tag_number' => 'TAG-'.bin2hex(random_bytes(4)),
            'name' => 'Animal prueba',
            'sex' => 'F',
            'entry_date' => now()->toDateString(),
            'enclosure_id' => $enclosure->id,
            'species_id' => $species->id,
            'stay_status' => 'Cuarentena_Ingreso',
            'can_receive_visits' => 1,
        ], $overrides));
    }

    /** pwa-014 CA-02 */
    public function test_updates_can_receive_visits(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $animal = $this->makeAnimal(['can_receive_visits' => 1]);

        $this->actingAs($staff, 'web')
            ->patchJson("/api/v1/staff/animals/{$animal->id}", ['can_receive_visits' => 0])
            ->assertOk()
            ->assertJsonPath('data.can_receive_visits', 0);

        $this->assertDatabaseHas('animals', ['id' => $animal->id, 'can_receive_visits' => 0]);
    }

    /** pwa-014 CA-03, RN-05, RN-06 */
    public function test_updates_stay_status_with_reason_and_controls_transition(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $animal = $this->makeAnimal(['stay_status' => 'Cuarentena_Ingreso']);

        $this->actingAs($staff, 'web')
            ->patchJson("/api/v1/staff/animals/{$animal->id}", [
                'stay_status' => 'Permanente',
                'reason' => 'Evaluación completada',
            ])
            ->assertOk()
            ->assertJsonPath('data.stay_status', 'Permanente');

        $this->assertDatabaseHas('animals', ['id' => $animal->id, 'stay_status' => 'Permanente']);
    }

    /** pwa-014 CA-04, RN-05, RN-06 */
    public function test_rejects_invalid_transition_and_missing_reason(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $animal = $this->makeAnimal(['stay_status' => 'Cuarentena_Ingreso']);

        $this->actingAs($staff, 'web')
            ->patchJson("/api/v1/staff/animals/{$animal->id}", ['stay_status' => 'Liberado', 'reason' => 'x'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('stay_status');

        $this->actingAs($staff, 'web')
            ->patchJson("/api/v1/staff/animals/{$animal->id}", ['stay_status' => 'Permanente'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reason');

        $this->assertDatabaseHas('animals', ['id' => $animal->id, 'stay_status' => 'Cuarentena_Ingreso']);
    }

    /** pwa-014 RN-04 */
    public function test_non_visitable_status_forces_can_receive_visits_off(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $animal = $this->makeAnimal(['stay_status' => 'Permanente', 'can_receive_visits' => 1]);

        $this->actingAs($staff, 'web')
            ->patchJson("/api/v1/staff/animals/{$animal->id}", [
                'stay_status' => 'Trasladado',
                'can_receive_visits' => 1,
                'reason' => 'Traslado autorizado',
            ])
            ->assertOk()
            ->assertJsonPath('data.stay_status', 'Trasladado')
            ->assertJsonPath('data.can_receive_visits', 0);

        $this->assertDatabaseHas('animals', [
            'id' => $animal->id,
            'stay_status' => 'Trasladado',
            'can_receive_visits' => 0,
        ]);
    }

    /** pwa-014 CA-04 */
    public function test_requires_permission(): void
    {
        $staff = $this->createStaffUser('executive');
        $animal = $this->makeAnimal();

        $this->actingAs($staff, 'web')
            ->patchJson("/api/v1/staff/animals/{$animal->id}", ['can_receive_visits' => 0])
            ->assertForbidden();
    }
}