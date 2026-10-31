<?php

namespace App\Actions\Catalog;

use App\Models\Species;

class GetSpeciesAction
{
    public function execute(int $speciesId): ?Species
    {
        return Species::query()
            ->with(['animals.enclosure'])
            ->find($speciesId);
    }
}
