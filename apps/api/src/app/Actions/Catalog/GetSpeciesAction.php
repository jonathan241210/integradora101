<?php

namespace App\Actions\Catalog;

use App\Models\Species;

class GetSpeciesAction
{
    public function execute(int $speciesId): ?Species
    {
        return Species::query()
            ->with(['animals' => fn ($query) => $query->publiclyVisible(), 'animals.enclosure'])
            ->find($speciesId);
    }
}
