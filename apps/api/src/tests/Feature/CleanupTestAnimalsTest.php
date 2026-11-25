<?php

namespace Tests\Feature;

use App\Actions\Staff\CleanupTestAnimalsAction;
use App\Models\Animal;
use App\Models\Enclosure;
use App\Models\Species;
use DomainException;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class CleanupTestAnimalsTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    public function test_ca01_ca02_ca03_preview_apply_and_retry_preserve_related_records(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $enclosure = Enclosure::query()->create(['name' => 'Recinto de verificación']);
        $species = Species::query()->create([
            'common_name' => 'Especie '.bin2hex(random_bytes(5)),
            'scientific_name' => 'Animalia',
        ]);
        $animals = [];
        foreach (['Ejemplar de prueba', 'Ejemplar conservado'] as $name) {
            $animals[] = Animal::query()->create([
                'name' => $name,
                'tag_number' => 'CLEANUP-'.bin2hex(random_bytes(5)),
                'responsible_id' => $staff->id,
                'sex' => 'F',
                'entry_date' => now()->toDateString(),
                'enclosure_id' => $enclosure->id,
                'species_id' => $species->id,
                'stay_status' => 'Cuarentena_Ingreso',
            ]);
        }
        [$target, $retained] = $animals;
        $evaluationId = DB::table('clinical_evaluations')->insertGetId([
            'animal_id' => $target->id,
            'veterinarian_id' => $staff->id,
            'evaluation_type' => 'Revision_Rapida',
            'evaluation_reason' => 'Revisión',
            'evaluation_date' => now()->toDateString(),
        ]);
        $departureId = DB::table('animal_departures')->insertGetId([
            'animal_id' => $target->id,
            'departure_date' => now()->toDateString(),
            'departure_status' => 'transfer',
        ]);
        $action = app(CleanupTestAnimalsAction::class);
        $expected = [$target->id => [$target->name, $target->tag_number]];

        $preview = $action->execute($expected, false);
        $this->assertSame(1, $preview['rows'][$target->id]['evaluations']);
        $this->assertSame(1, $preview['rows'][$target->id]['departures']);
        $this->assertSame([], $preview['changed']);
        $this->assertNull($target->refresh()->deleted_at);

        $retained->update(['origin' => 'Prueba DBR-019']);
        $protected = $action->execute($expected, true, [$target->id]);
        $this->assertContains($target->id, $protected['mismatches']);
        $this->assertContains($retained->id, $protected['mismatches']);
        $this->assertNull($target->refresh()->deleted_at);

        $mismatch = $action->execute($expected + [$retained->id => ['Otro nombre', $retained->tag_number]], true);
        $this->assertSame([$retained->id], $mismatch['mismatches']);
        $this->assertNull($target->refresh()->deleted_at);

        $result = $action->execute($expected, true);
        $this->assertSame([$target->id], array_keys($result['changed']));
        $this->assertSoftDeleted($target);
        $this->assertNull($retained->refresh()->deleted_at);
        $this->assertDatabaseHas('clinical_evaluations', ['id' => $evaluationId, 'animal_id' => $target->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('animal_departures', ['id' => $departureId, 'animal_id' => $target->id]);

        $retry = $action->execute($expected, true);
        $this->assertSame([], $retry['changed']);
        $this->assertSame($result['changed'][$target->id], $retry['rows'][$target->id]['deleted_at']);
    }

    public function test_ca03_rejects_another_database_before_querying(): void
    {
        $connection = DB::connection();
        $connection->setDatabaseName('another_database');

        try {
            $this->expectException(DomainException::class);
            app(CleanupTestAnimalsAction::class)->execute([1 => ['Ejemplar', 'TAG']], false);
        } finally {
            $connection->setDatabaseName('arca_pruebas');
        }
    }
}
