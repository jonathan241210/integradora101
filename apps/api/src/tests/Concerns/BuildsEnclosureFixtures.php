<?php

namespace Tests\Concerns;

use App\Models\Enclosure;
use App\Models\EnclosureQrCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Fixtures de api-019 (recintos). Solo se usan dentro de transacciones de prueba. */
trait BuildsEnclosureFixtures
{
    protected function makeEnclosure(array $attributes = []): Enclosure
    {
        $enclosure = Enclosure::query()->forceCreate(array_merge(['name' => 'Recinto '.bin2hex(random_bytes(5))], $attributes));

        return Enclosure::withTrashed()->findOrFail($enclosure->id);
    }

    protected function makeSpeciesId(array $attributes = []): int
    {
        return DB::table('species')->insertGetId(array_merge(['common_name' => 'Especie '.bin2hex(random_bytes(5))], $attributes));
    }

    protected function makeAnimal(Enclosure $enclosure, ?int $speciesId = null, bool $visits = true): int
    {
        return DB::table('animals')->insertGetId([
            'name' => 'Animal '.bin2hex(random_bytes(3)),
            'entry_date' => '2026-01-01',
            'enclosure_id' => $enclosure->id,
            'species_id' => $speciesId ?? $this->makeSpeciesId(),
            'can_receive_visits' => $visits ? 1 : 0,
            'stay_status' => 'Permanente',
        ]);
    }

    protected function makeQr(Enclosure $enclosure): string
    {
        $code = 'ARCA-'.Str::upper(Str::random(8));
        EnclosureQrCode::query()->create(['enclosure_id' => $enclosure->id, 'code' => $code, 'is_active' => true]);

        return $code;
    }

    protected function activityCount(Enclosure $enclosure): int
    {
        return DB::table('activity_log')
            ->where('subject_type', Enclosure::class)
            ->where('subject_id', $enclosure->id)
            ->count();
    }
}
