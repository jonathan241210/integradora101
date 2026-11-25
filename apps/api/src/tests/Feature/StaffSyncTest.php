<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\Enclosure;
use App\Models\Species;
use App\Models\SyncOperation;
use Illuminate\Support\Str;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class StaffSyncTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-01 offline-sync */
    public function test_ca01_sync_bootstrap_returns_profile_catalogs_and_cursor(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $enclosure = Enclosure::query()->create(['name' => 'Recinto sync '.bin2hex(random_bytes(4))]);
        $species = Species::query()->create([
            'common_name' => 'Especie sync '.bin2hex(random_bytes(4)),
            'scientific_name' => 'Syncus testus',
        ]);
        Animal::query()->create([
            'tag_number' => 'SYNC-'.bin2hex(random_bytes(4)),
            'responsible_id' => $staff->id,
            'name' => 'Animal sync',
            'sex' => 'F',
            'enclosure_id' => $enclosure->id,
            'species_id' => $species->id,
            'stay_status' => 'Cuarentena_Ingreso',
            'entry_date' => now()->toDateString(),
        ]);

        $this->actingAs($staff, 'web')
            ->getJson('/api/v1/staff/sync/bootstrap')
            ->assertOk()
            ->assertJsonPath('data.profile.id', $staff->id)
            ->assertJsonStructure([
                'data' => [
                    'profile' => ['id', 'name'],
                    'animals',
                    'enclosures',
                    'species',
                    'cursor',
                    'server_time',
                ],
            ]);
    }

    /** CA-04, CA-08 offline-sync */
    public function test_ca04_ca08_sync_operations_creates_animal_once_for_same_uuid(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $enclosure = Enclosure::query()->create(['name' => 'Recinto op '.bin2hex(random_bytes(4))]);
        $species = Species::query()->create([
            'common_name' => 'Especie op '.bin2hex(random_bytes(4)),
            'scientific_name' => 'Operatio testus',
        ]);

        $operationUuid = (string) Str::uuid();
        $clientAnimalId = (string) Str::uuid();
        $tag = 'SYNC-OP-'.bin2hex(random_bytes(4));

        $payload = [
            'operations' => [[
                'operation_uuid' => $operationUuid,
                'entity_type' => 'animal',
                'client_entity_id' => $clientAnimalId,
                'payload' => [
                    'name' => 'Animal offline',
                    'species_id' => $species->id,
                    'tag_number' => $tag,
                    'enclosure_id' => $enclosure->id,
                    'sex' => 'hembra',
                        'stay_status' => 'Trasladado',
                        'can_receive_visits' => 0,
                ],
            ]],
        ];

        $first = $this->actingAs($staff, 'web')
            ->postJson('/api/v1/staff/sync/operations', $payload)
            ->assertOk();

        $first->assertJsonPath('data.results.0.operation_uuid', $operationUuid)
            ->assertJsonPath('data.results.0.status', 'completed')
            ->assertJsonPath('data.results.0.entity_type', 'animal');

        $serverId = $first->json('data.results.0.server_id');
        $this->assertNotNull($serverId);
        $this->assertDatabaseHas('animals', [
            'id' => $serverId,
            'tag_number' => $tag,
            'stay_status' => 'Cuarentena_Ingreso', // pwa-013 CA-03
            'can_receive_visits' => 0,
        ]);
        $this->assertDatabaseHas('sync_operations', ['operation_uuid' => $operationUuid, 'status' => 'completed']);

        $second = $this->actingAs($staff, 'web')
            ->postJson('/api/v1/staff/sync/operations', $payload)
            ->assertOk();

        $second->assertJsonPath('data.results.0.operation_uuid', $operationUuid)
            ->assertJsonPath('data.results.0.status', 'duplicate')
            ->assertJsonPath('data.results.0.server_id', $serverId);

        $this->assertSame(1, Animal::query()->where('tag_number', $tag)->count());
        $this->assertSame(1, SyncOperation::query()->where('operation_uuid', $operationUuid)->count());
    }

    /** CA-06 offline-sync */
    public function test_ca06_sync_operations_returns_validation_rejection_without_duplicate(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $enclosure = Enclosure::query()->create(['name' => 'Recinto inval '.bin2hex(random_bytes(4))]);

        $operationUuid = (string) Str::uuid();
        $tag = 'SYNC-INV-'.bin2hex(random_bytes(4));

        $response = $this->actingAs($staff, 'web')
            ->postJson('/api/v1/staff/sync/operations', [
                'operations' => [[
                    'operation_uuid' => $operationUuid,
                    'entity_type' => 'animal',
                    'client_entity_id' => (string) Str::uuid(),
                    'payload' => [
                        'name' => 'Animal inválido',
                        // falta species/species_id
                        'tag_number' => $tag,
                        'enclosure_id' => $enclosure->id,
                        'sex' => 'hembra',
                    ],
                ]],
            ])
            ->assertOk();

        $response->assertJsonPath('data.results.0.operation_uuid', $operationUuid)
            ->assertJsonPath('data.results.0.status', 'rejected');

        $this->assertDatabaseMissing('animals', ['tag_number' => $tag]);
        $this->assertDatabaseHas('sync_operations', [
            'operation_uuid' => $operationUuid,
            'status' => 'rejected',
        ]);

        // Reintento del mismo UUID no debe crear registros ni duplicar operación
        $this->actingAs($staff, 'web')
            ->postJson('/api/v1/staff/sync/operations', [
                'operations' => [[
                    'operation_uuid' => $operationUuid,
                    'entity_type' => 'animal',
                    'client_entity_id' => (string) Str::uuid(),
                    'payload' => [
                        'name' => 'Animal inválido',
                        'tag_number' => $tag,
                        'enclosure_id' => $enclosure->id,
                        'sex' => 'hembra',
                    ],
                ]],
            ])
            ->assertOk()
            ->assertJsonPath('data.results.0.status', 'rejected');

        $this->assertSame(1, SyncOperation::query()->where('operation_uuid', $operationUuid)->count());
        $this->assertDatabaseMissing('animals', ['tag_number' => $tag]);
    }
}
