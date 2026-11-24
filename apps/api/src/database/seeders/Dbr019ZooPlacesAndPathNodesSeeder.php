<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use RuntimeException;

class Dbr019ZooPlacesAndPathNodesSeeder extends Seeder
{
    /**
     * Carga controlada DBR-019 (Fase 2): zoo_places y path_nodes desde dataset normalizado.
     * No inserta en enclosures: requiere mapeo manual a filas existentes.
     *
     * Uso (responsable de BD, ambiente aprobado):
     *   php artisan db:seed --class=Database\\Seeders\\Dbr019ZooPlacesAndPathNodesSeeder
     */
    public function run(): void
    {
        $path = database_path('data/dbr019-zoo-places-normalized.json');
        if (! File::exists($path)) {
            throw new RuntimeException("Dataset no encontrado: {$path}");
        }

        $raw = File::get($path);
        // Eliminar BOM UTF-8 si existe (p. ej. archivos generados en Windows PowerShell).
        if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) {
            $raw = substr($raw, 3);
        }

        $data = json_decode($raw, true);
        if (! is_array($data)) {
            throw new RuntimeException('Dataset JSON inválido: '.json_last_error_msg());
        }

        $now = now();

        DB::transaction(function () use ($data, $now): void {
            $this->seedZooPlaces($data['lugares'] ?? [], $now);
            $this->seedPathNodes($data['nodos_ruta'] ?? [], $now);
        });

        $this->command?->info('DBR-019: carga de zoo_places y path_nodes completada.');
        $this->command?->warn('DBR-019: enclosures no se actualizó automáticamente (requiere mapeo manual a registros existentes).');
    }

    /**
     * @param  array<int, array<string, mixed>>  $lugares
     */
    private function seedZooPlaces(array $lugares, mixed $now): void
    {
        foreach ($lugares as $row) {
            $name = $this->stringValue($row['name_original'] ?? $row['name'] ?? null);
            $placeType = $this->stringValue($row['subtype'] ?? $row['place_type'] ?? null);
            if ($name === null || $placeType === null) {
                throw new RuntimeException('Registro de lugar inválido: requiere name y place_type/subtype.');
            }

            $record = [
                'name' => $name,
                'name_original' => $this->nullableString($row['name_original'] ?? null),
                'place_type' => $placeType,
                'gps_lat' => $this->nullableDecimal($row['gps_lat'] ?? null),
                'gps_lon' => $this->nullableDecimal($row['gps_lon'] ?? null),
                'map_x' => $this->nullableDecimal($row['map_x'] ?? null),
                'map_y' => $this->nullableDecimal($row['map_y'] ?? null),
                'is_visible' => true,
                'deleted_at' => null,
                'updated_at' => $now,
            ];

            // Idempotencia controlada por huella del levantamiento (nombre original + tipo + coords GPS).
            $attributes = [
                'name_original' => $record['name_original'],
                'place_type' => $record['place_type'],
                'gps_lat' => $record['gps_lat'],
                'gps_lon' => $record['gps_lon'],
            ];

            $existing = DB::table('zoo_places')->where($attributes)->first();
            if ($existing) {
                DB::table('zoo_places')->where('id', $existing->id)->update($record);
            } else {
                DB::table('zoo_places')->insert($record + ['created_at' => $now]);
            }
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $nodos
     */
    private function seedPathNodes(array $nodos, mixed $now): void
    {
        foreach ($nodos as $row) {
            $nodeType = $this->stringValue($row['subtype'] ?? $row['node_type'] ?? null);
            if ($nodeType === null) {
                throw new RuntimeException('Registro de nodo de ruta inválido: requiere node_type/subtype.');
            }

            $record = [
                'name' => $this->nullableString($row['name_original'] ?? $row['name'] ?? null),
                'node_type' => $nodeType,
                'gps_lat' => $this->nullableDecimal($row['gps_lat'] ?? null),
                'gps_lon' => $this->nullableDecimal($row['gps_lon'] ?? null),
                'map_x' => $this->nullableDecimal($row['map_x'] ?? null),
                'map_y' => $this->nullableDecimal($row['map_y'] ?? null),
                'deleted_at' => null,
                'updated_at' => $now,
            ];

            $attributes = [
                'name' => $record['name'],
                'node_type' => $record['node_type'],
                'gps_lat' => $record['gps_lat'],
                'gps_lon' => $record['gps_lon'],
            ];

            $existing = DB::table('path_nodes')->where($attributes)->first();
            if ($existing) {
                DB::table('path_nodes')->where('id', $existing->id)->update($record);
            } else {
                DB::table('path_nodes')->insert($record + ['created_at' => $now]);
            }
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

    private function nullableString(mixed $value): ?string
    {
        return $this->stringValue($value);
    }

    private function nullableDecimal(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return number_format((float) $value, 8, '.', '');
    }
}
