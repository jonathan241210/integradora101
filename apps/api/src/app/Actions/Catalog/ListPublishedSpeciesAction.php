<?php

namespace App\Actions\Catalog;

use App\Models\Species;
use Illuminate\Database\Eloquent\Collection;

/**
 * Public read of published species (api-015). Read only: no writes, no Activitylog.
 */
class ListPublishedSpeciesAction
{
    /**
     * @return Collection<int, Species>
     */
    public function execute(?string $habitat = null, ?string $name = null, ?string $category = null): Collection
    {
        $query = Species::query()
            ->select([
                'species.id',
                'species.common_name',
                'species.scientific_name',
                'species.category',
                'species.distribution',
                'species.habitat',
                'species.image_path',
                'species.published_fields',
            ])
            ->where('species.is_published', 1)
            ->whereNull('species.deleted_at');

        if ($habitat !== null) {
            $query->whereJsonContains('species.published_fields', 'habitat')
                ->whereRaw(
                    'LOWER(TRIM(species.habitat)) COLLATE utf8mb4_bin = ?',
                    [mb_strtolower(trim($habitat))]
                );
        }

        if ($name !== null) {
            $query->whereRaw(
                'LOWER(species.common_name) COLLATE utf8mb4_bin LIKE ?',
                ['%'.addcslashes(mb_strtolower(trim($name)), '%_\\').'%']
            );
        }

        if ($category !== null) {
            $query->where('species.category', $category);
        }

        return $query->orderBy('species.common_name')->orderBy('species.id')->get();
    }
}
