<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use RuntimeException;

class Dbr019MapCoordinatesSeeder extends Seeder
{
    /**
     * Carga controlada DBR-019: completa map_x/map_y desde el SVG canónico
     * en recintos (enclosures) y lugares (zoo_places) ya existentes.
     *
     * No crea filas nuevas ni modifica esquema. Solo actualiza map_x/map_y
     * cuando el JSON trae coordenadas identificadas.
     *
     * Uso (responsable de BD, ambiente aprobado):
     *   php artisan db:seed --class=Database\\Seeders\\Dbr019MapCoordinatesSeeder
     */
    public function run(): void
    {
        $normalizedPath = database_path('data/dbr019-zoo-places-normalized.json');
        $enclosuresPath = database_path('data/dbr019-enclosures-gps-update.json');

        $normalized = $this->readJson($normalizedPath);
        $enclosures = $this->readJson($enclosuresPath);

        $now = now();
        $updatedEnclosures = 0;
        $updatedPlaces = 0;
        $skippedEnclosures = [];
        $skippedPlaces = [];

        DB::transaction(function () use ($enclosures, $normalized, $now, &$updatedEnclosures, &$updatedPlaces, &$skippedEnclosures, &$skippedPlaces): void {
            foreach ($enclosures as $row) {
                $mapX = $this->nullableDecimal($row['map_x'] ?? null, 4);
                $mapY = $this->nullableDecimal($row['map_y'] ?? null, 4);
                if ($mapX === null || $mapY === null) {
                    continue;
                }

                $name = $this->stringValue($row['name_original'] ?? $row['name'] ?? null);
                $gpsLat = $this->nullableDecimal($row['gps_lat'] ?? null, 8);
                $gpsLon = $this->nullableDecimal($row['gps_lon'] ?? null, 8);

                $query = DB::table('enclosures')->whereNull('deleted_at');
                if ($name !== null) {
                    $query->where('name', $name);
                }
                if ($gpsLat !== null) {
                    $query->where('gps_lat', $gpsLat);
                }
                if ($gpsLon !== null) {
                    $query->where('gps_lon', $gpsLon);
                }

                $existing = $query->first();
                if (! $existing) {
                    $skippedEnclosures[] = $name ?? ($row['suggested_id'] ?? 'unknown');
                    continue;
                }

                DB::table('enclosures')->where('id', $existing->id)->update([
                    'map_x' => $mapX,
                    'map_y' => $mapY,
                    'updated_at' => $now,
                ]);
                $updatedEnclosures++;
            }

            foreach (($normalized['lugares'] ?? []) as $row) {
                $mapX = $this->nullableDecimal($row['map_x'] ?? null, 4);
                $mapY = $this->nullableDecimal($row['map_y'] ?? null, 4);
                if ($mapX === null || $mapY === null) {
                    continue;
                }

                $nameOriginal = $this->nullableString($row['name_original'] ?? null);
                $placeType = $this->stringValue($row['place_type'] ?? $row['subtype'] ?? null);
                $gpsLat = $this->nullableDecimal($row['gps_lat'] ?? null, 8);
                $gpsLon = $this->nullableDecimal($row['gps_lon'] ?? null, 8);

                $existing = DB::table('zoo_places')
                    ->whereNull('deleted_at')
                    ->where('name_original', $nameOriginal)
                    ->where('place_type', $placeType)
                    ->where('gps_lat', $gpsLat)
                    ->where('gps_lon', $gpsLon)
                    ->first();

                if (! $existing) {
                    $skippedPlaces[] = $nameOriginal ?? ($row['suggested_id'] ?? 'unknown');
                    continue;
                }

                DB::table('zoo_places')->where('id', $existing->id)->update([
                    'map_x' => $mapX,
                    'map_y' => $mapY,
                    'updated_at' => $now,
                ]);
                $updatedPlaces++;
            }
        });

        $this->command?->info("DBR-019: map_x/map_y actualizados en enclosures={$updatedEnclosures}, zoo_places={$updatedPlaces}.");
        if ($skippedEnclosures !== []) {
            $this->command?->warn('DBR-019: enclosures sin match: '.implode(', ', $skippedEnclosures));
        }
        if ($skippedPlaces !== []) {
            $this->command?->warn('DBR-019: zoo_places sin match: '.implode(', ', $skippedPlaces));
        }
    }

    /**
     * @return array<mixed>
     */
    private function readJson(string $path): array
    {
        if (! File::exists($path)) {
            throw new RuntimeException("Dataset no encontrado: {$path}");
        }
        $raw = File::get($path);
        if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) {
            $raw = substr($raw, 3);
        }
        $data = json_decode($raw, true);
        if (! is_array($data)) {
            throw new RuntimeException('Dataset JSON inválido: '.json_last_error_msg());
        }

        return $data;
    }

    private function stringValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);

        return $s === '' ? null : $s;
    }

    private function nullableString(mixed $value): ?string
    {
        return $this->stringValue($value);
    }

    private function nullableDecimal(mixed $value, int $scale = 4): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return number_format((float) $value, $scale, '.', '');
    }
}
