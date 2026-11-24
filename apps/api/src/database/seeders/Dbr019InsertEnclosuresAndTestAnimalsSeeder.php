<?php

namespace Database\Seeders;

use Database\Seeders\Concerns\RefusesProduction;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use RuntimeException;

class Dbr019InsertEnclosuresAndTestAnimalsSeeder extends Seeder
{
    use RefusesProduction;

    /**
     * DBR-019: inserta los 63 recintos del levantamiento como nuevos enclosures
     * y crea un animal de prueba asignado a cada uno (para arca_pruebas).
     *
     * - Conserva los enclosures existentes (1,2,3,145, etc.).
     * - Idempotente por huella (name + gps_lat + gps_lon) en enclosures.
     * - Para animales usa una especie existente o crea "Especie de prueba (DBR-019)" si es posible.
     *
     * Uso (responsable de BD, ambiente aprobado):
     *   php artisan db:seed --class=Database\\Seeders\\Dbr019InsertEnclosuresAndTestAnimalsSeeder
     */
    public function run(): void
    {
        $this->refuseProduction();

        $path = database_path('data/dbr019-enclosures-gps-update.json');
        if (! File::exists($path)) {
            throw new RuntimeException("Dataset no encontrado: {$path}");
        }

        $raw = File::get($path);
        if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) {
            $raw = substr($raw, 3);
        }

        $rows = json_decode($raw, true);
        if (! is_array($rows)) {
            throw new RuntimeException('Dataset JSON inválido: '.json_last_error_msg());
        }

        $now = now();
        $speciesId = $this->resolveOrCreateTestSpeciesId($now);

        $enclosuresInserted = 0;
        $enclosuresExisting = 0;
        $animalsInserted = 0;
        $animalsExisting = 0;

        DB::transaction(function () use (
            $rows,
            $now,
            $speciesId,
            &$enclosuresInserted,
            &$enclosuresExisting,
            &$animalsInserted,
            &$animalsExisting
        ): void {
            foreach ($rows as $row) {
                $name = $this->stringValue($row['name_original'] ?? $row['name'] ?? null);
                if ($name === null) {
                    throw new RuntimeException('Registro de recinto inválido: requiere name_original/name.');
                }

                $gpsLat = $this->nullableDecimal($row['gps_lat'] ?? null);
                $gpsLon = $this->nullableDecimal($row['gps_lon'] ?? null);

                $enclosure = DB::table('enclosures')
                    ->where('name', $name)
                    ->where('gps_lat', $gpsLat)
                    ->where('gps_lon', $gpsLon)
                    ->first();

                if ($enclosure) {
                    $enclosureId = (int) $enclosure->id;
                    $enclosuresExisting++;
                } else {
                    $enclosureId = (int) DB::table('enclosures')->insertGetId([
                        'name' => $name,
                        'gps_lat' => $gpsLat,
                        'gps_lon' => $gpsLon,
                        'map_x' => $this->nullableDecimal($row['map_x'] ?? null),
                        'map_y' => $this->nullableDecimal($row['map_y'] ?? null),
                    ]);
                    $enclosuresInserted++;
                }

                if ($speciesId === null) {
                    continue;
                }

                $animalName = 'Animal de prueba - '.$name;
                $existingAnimal = DB::table('animals')
                    ->where('name', $animalName)
                    ->where('enclosure_id', $enclosureId)
                    ->where('species_id', $speciesId)
                    ->first();

                if ($existingAnimal) {
                    $animalsExisting++;

                    continue;
                }

                $animal = [
                    'name' => $animalName,
                    'species_id' => $speciesId,
                    'enclosure_id' => $enclosureId,
                    'sex' => 'Desconocido',
                    'stay_status' => 'Permanente',
                    'can_receive_visits' => 1,
                    'entry_date' => $now->toDateString(),
                ];

                // Campos opcionales frecuentes (se agregan solo si existen en la tabla actual).
                if ($this->hasColumn('animals', 'tag_number')) {
                    $animal['tag_number'] = null;
                }
                if ($this->hasColumn('animals', 'origin')) {
                    $animal['origin'] = 'Prueba DBR-019';
                }
                if ($this->hasColumn('animals', 'characteristics')) {
                    $animal['characteristics'] = 'Registro de prueba generado para recinto de campo.';
                }
                if ($this->hasColumn('animals', 'created_at')) {
                    $animal['created_at'] = $now;
                }
                if ($this->hasColumn('animals', 'updated_at')) {
                    $animal['updated_at'] = $now;
                }

                DB::table('animals')->insert($animal);
                $animalsInserted++;
            }
        });

        $this->command?->info("DBR-019: enclosures insertados={$enclosuresInserted}, ya existentes={$enclosuresExisting}.");
        if ($speciesId === null) {
            $this->command?->warn('DBR-019: no se creó especie de prueba; no se insertaron animales. Revisa la tabla species y vuelve a ejecutar.');
        } else {
            $this->command?->info("DBR-019: animales de prueba insertados={$animalsInserted}, ya existentes={$animalsExisting} (species_id={$speciesId}).");
        }
    }

    private function resolveOrCreateTestSpeciesId(mixed $now): ?int
    {
        $existing = DB::table('species')->orderBy('id')->value('id');
        if ($existing !== null) {
            return (int) $existing;
        }

        // Intento mínimo de crear especie de prueba si no hay ninguna.
        $record = ['common_name' => 'Especie de prueba DBR-019'];
        if ($this->hasColumn('species', 'scientific_name')) {
            $record['scientific_name'] = 'Testus dbr019';
        }
        if ($this->hasColumn('species', 'distribution')) {
            $record['distribution'] = 'N/A';
        }
        if ($this->hasColumn('species', 'conservation_status')) {
            $record['conservation_status'] = 'No evaluada';
        }
        if ($this->hasColumn('species', 'is_published')) {
            $record['is_published'] = 0;
        }
        if ($this->hasColumn('species', 'created_at')) {
            $record['created_at'] = $now;
        }
        if ($this->hasColumn('species', 'updated_at')) {
            $record['updated_at'] = $now;
        }

        try {
            return (int) DB::table('species')->insertGetId($record);
        } catch (\Throwable $e) {
            $this->command?->warn('DBR-019: no se pudo crear especie de prueba automáticamente: '.$e->getMessage());

            return null;
        }
    }

    private function hasColumn(string $table, string $column): bool
    {
        try {
            return DB::getSchemaBuilder()->hasColumn($table, $column);
        } catch (\Throwable) {
            return false;
        }
    }

    private function stringValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);

        return $s === '' ? null : $s;
    }

    private function nullableDecimal(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return number_format((float) $value, 8, '.', '');
    }
}
