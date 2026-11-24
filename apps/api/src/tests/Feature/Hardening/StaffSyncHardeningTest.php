<?php

namespace Tests\Feature\Hardening;

use App\Models\Animal;
use App\Models\Enclosure;
use App\Models\Species;
use App\Models\SyncOperation;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use PDOException;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

/** api-028 · lote acotado y errores transitorios (CA-07, CA-08). */
class StaffSyncHardeningTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-07 pre-delivery-hardening */
    public function test_ca07_batch_over_100_operations_is_rejected_without_processing(): void
    {
        $vet = $this->createStaffUser('veterinarian');
        $uuids = [];
        $operations = [];
        for ($i = 0; $i < 101; $i++) {
            $uuids[] = $uuid = (string) Str::uuid();
            $operations[] = ['operation_uuid' => $uuid, 'entity_type' => 'animal', 'payload' => ['name' => 'X']];
        }

        $this->actingAs($vet, 'web')
            ->postJson('/api/v1/staff/sync/operations', ['operations' => $operations])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('operations');

        $this->assertSame(0, SyncOperation::query()->whereIn('operation_uuid', $uuids)->count());
    }

    /** CA-08 pre-delivery-hardening */
    public function test_ca08_transient_database_error_returns_retry_and_is_processed_on_retry(): void
    {
        $vet = $this->createStaffUser('veterinarian');
        $enclosure = Enclosure::query()->create(['name' => 'Recinto retry '.bin2hex(random_bytes(4))]);
        $species = Species::query()->create(['common_name' => 'Especie retry '.bin2hex(random_bytes(4)), 'scientific_name' => 'Retryus testus']);
        $uuid = (string) Str::uuid();
        $tag = 'RETRY-'.bin2hex(random_bytes(4));
        $payload = ['operations' => [[
            'operation_uuid' => $uuid,
            'entity_type' => 'animal',
            'client_entity_id' => (string) Str::uuid(),
            'payload' => ['name' => 'Animal retry', 'species_id' => $species->id, 'tag_number' => $tag, 'enclosure_id' => $enclosure->id, 'sex' => 'hembra'],
        ]]];

        Animal::creating(function () {
            throw new QueryException('mysql', 'insert into animals', [], new PDOException('Deadlock found when trying to get lock'));
        });

        $this->actingAs($vet, 'web')->postJson('/api/v1/staff/sync/operations', $payload)
            ->assertOk()
            ->assertJsonPath('data.results.0.status', 'retry')
            ->assertJsonPath('data.results.0.operation_uuid', $uuid);

        $this->assertDatabaseMissing('sync_operations', ['operation_uuid' => $uuid]);
        $this->assertDatabaseMissing('animals', ['tag_number' => $tag]);

        Animal::flushEventListeners();

        $this->actingAs($vet, 'web')->postJson('/api/v1/staff/sync/operations', $payload)
            ->assertOk()
            ->assertJsonPath('data.results.0.status', 'completed');
        $this->assertDatabaseHas('sync_operations', ['operation_uuid' => $uuid, 'status' => 'completed']);
        $this->assertDatabaseHas('animals', ['tag_number' => $tag]);
    }
}
