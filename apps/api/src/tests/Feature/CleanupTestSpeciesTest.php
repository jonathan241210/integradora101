<?php

namespace Tests\Feature;

use App\Actions\Staff\CleanupTestSpeciesAction;
use App\Models\Animal;
use App\Models\Enclosure;
use App\Models\Species;
use DomainException;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class CleanupTestSpeciesTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    public function test_ca01_ca02_ca03_cleanup_preserves_history_and_syncs_the_deletion(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $enclosure = Enclosure::query()->create(['name' => 'Recinto de verificación de especies']);
        $species = Species::query()->create([
            'common_name' => 'Especie temporal '.bin2hex(random_bytes(5)),
            'scientific_name' => 'Animalia',
            'is_published' => true,
        ]);
        $animal = Animal::query()->create([
            'name' => 'Ejemplar de prueba',
            'tag_number' => 'SPECIES-'.bin2hex(random_bytes(5)),
            'responsible_id' => $staff->id,
            'sex' => 'F',
            'entry_date' => today()->toDateString(),
            'enclosure_id' => $enclosure->id,
            'species_id' => $species->id,
            'stay_status' => 'Cuarentena_Ingreso',
        ]);
        $expected = [$species->id => $species->common_name];
        $action = app(CleanupTestSpeciesAction::class);
        $this->assertSame([$species->id], $action->execute($expected, true)['blocked']);
        $this->assertSame([$species->id], $action->execute([$species->id => 'Otro nombre'], false)['blocked']);
        $animal->delete();

        $preview = $action->execute($expected, false);
        $this->assertSame(1, $preview['rows'][$species->id]['archived']);
        $this->assertSame([], $preview['changed']);
        $this->assertNull($species->refresh()->deleted_at);
        $this->getJson('/api/v1/species/'.$species->id)->assertOk();
        $since = now()->subMinute()->format('Y-m-d H:i:s');

        $result = $action->execute($expected, true);
        $this->assertSame([$species->id], array_keys($result['changed']));
        $this->assertSoftDeleted($species);
        $this->assertDatabaseHas('animals', ['id' => $animal->id, 'species_id' => $species->id]);
        $this->getJson('/api/v1/species/'.$species->id)->assertNotFound();
        $this->getJson('/api/v1/published-species')->assertOk()->assertJsonMissing(['id' => $species->id]);
        $changes = $this->actingAs($staff, 'web')
            ->getJson('/api/v1/staff/sync/changes?'.http_build_query(['since' => $since]))
            ->assertOk()->json('data.species');
        $this->assertNotNull(collect($changes)->firstWhere('id', $species->id)['deleted_at'] ?? null);

        $retry = $action->execute($expected, true);
        $this->assertSame([], $retry['changed']);
        $this->assertSame($result['changed'][$species->id], $retry['rows'][$species->id]['deleted_at']);
    }

    public function test_ca01_rejects_another_database(): void
    {
        $connection = DB::connection();
        $connection->setDatabaseName('another_database');

        try {
            $this->expectException(DomainException::class);
            app(CleanupTestSpeciesAction::class)->execute([85 => 'Gordo'], false);
        } finally {
            $connection->setDatabaseName('arca_pruebas');
        }
    }
}
