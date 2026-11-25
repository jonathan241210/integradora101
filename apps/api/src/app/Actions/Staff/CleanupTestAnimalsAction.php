<?php

namespace App\Actions\Staff;

use App\Models\Animal;
use DomainException;

class CleanupTestAnimalsAction
{
    public function execute(array $expected, bool $apply, ?array $retainedIds = null): array
    {
        $query = Animal::withTrashed();
        $connection = $query->getModel()->getConnection();

        if (app()->isProduction() || $connection->getDatabaseName() !== 'arca_pruebas') {
            throw new DomainException('La limpieza solo está permitida en arca_pruebas fuera de producción.');
        }

        $inspect = function () use ($query, $connection, $expected, $apply, $retainedIds): array {
            $query->orderBy('id');
            if ($retainedIds === null) {
                $query->whereKey(array_keys($expected));
            }
            if ($apply) {
                $query->lockForUpdate();
            }

            $animals = $query->get()->keyBy('id');
            $rows = [];
            $mismatches = [];
            if ($retainedIds !== null) {
                foreach ($retainedIds as $id) {
                    $animal = $animals->get($id);
                    if ($animal === null || $animal->trashed() || $animal->origin !== 'Prueba DBR-019') {
                        $mismatches[] = $id;
                    }
                }
                foreach ($animals->except([...array_keys($expected), ...$retainedIds]) as $animal) {
                    if (! $animal->trashed()) {
                        $mismatches[] = $animal->id;
                    }
                }
            }
            foreach ($expected as $id => [$name, $tag]) {
                $animal = $animals->get($id);
                if ($animal === null || $animal->name !== $name || $animal->tag_number !== $tag || $animal->origin === 'Prueba DBR-019') {
                    $mismatches[] = $id;

                    continue;
                }

                $rows[$id] = [
                    'id' => $id,
                    'name' => $name,
                    'tag' => $tag,
                    'evaluations' => $connection->table('clinical_evaluations')->where('animal_id', $id)->count(),
                    'departures' => $connection->table('animal_departures')->where('animal_id', $id)->count(),
                    'deleted_at' => $animal->getRawOriginal('deleted_at'),
                ];
            }

            $changed = [];
            if ($apply && $mismatches === []) {
                foreach ($animals->only(array_keys($expected)) as $animal) {
                    if ($animal->trashed()) {
                        continue;
                    }
                    if (! $animal->delete()) {
                        throw new DomainException('No se pudo completar la baja del lote.');
                    }
                    $changed[$animal->id] = $animal->getRawOriginal('deleted_at');
                    $rows[$animal->id]['deleted_at'] = $changed[$animal->id];
                }
            }

            return compact('rows', 'mismatches', 'changed');
        };

        return $apply ? $connection->transaction($inspect) : $inspect();
    }
}
