<?php

namespace App\Actions\Staff;

use App\Models\Species;
use DomainException;

class CleanupTestSpeciesAction
{
    public function execute(array $expected, bool $apply): array
    {
        $query = Species::withTrashed()->whereKey(array_keys($expected))->orderBy('id');
        $connection = $query->getModel()->getConnection();
        if (app()->isProduction() || $connection->getDatabaseName() !== 'arca_pruebas') {
            throw new DomainException('La limpieza solo está permitida en arca_pruebas fuera de producción.');
        }

        $inspect = function () use ($query, $connection, $expected, $apply): array {
            if ($apply) {
                $query->lockForUpdate();
            }
            $species = $query->get()->keyBy('id');
            $rows = [];
            $blocked = [];
            $changed = [];

            foreach ($expected as $id => $name) {
                $record = $species->get($id);
                if ($record === null || $record->common_name !== $name) {
                    $blocked[] = $id;

                    continue;
                }

                $active = $record->animals()->count();
                if ($active > 0) {
                    $blocked[] = $id;
                }
                $rows[$id] = [
                    'id' => $id,
                    'name' => $name,
                    'active' => $active,
                    'archived' => $record->animals()->onlyTrashed()->count(),
                    'requests' => $connection->table('species_publication_requests')->where('species_id', $id)->count(),
                    'collections' => $connection->table('visitor_collections')->where('species_id', $id)->count(),
                    'favorites' => $connection->table('visitor_favorite_species')->where('species_id', $id)->count(),
                    'deleted_at' => $record->getRawOriginal('deleted_at'),
                ];
            }

            if ($apply && $blocked === []) {
                foreach ($species as $record) {
                    if ($record->trashed()) {
                        continue;
                    }
                    if (! $record->delete()) {
                        throw new DomainException('No se pudo completar la baja de las especies.');
                    }
                    $changed[$record->id] = $record->getRawOriginal('deleted_at');
                    $rows[$record->id]['deleted_at'] = $changed[$record->id];
                }
            }

            return compact('rows', 'blocked', 'changed');
        };

        return $apply ? $connection->transaction($inspect) : $inspect();
    }
}
