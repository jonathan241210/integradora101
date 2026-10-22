<?php

namespace App\Actions\Catalog;

use App\Models\Species;
use Illuminate\Database\Eloquent\Collection;

class ListSpeciesAction
{
    /**
     * @return Collection<int, Species>
     */
    public function execute(): Collection
    {
        return Species::query()
            ->with(['animals.enclosure'])
            ->orderBy('common_name')
            ->get();
    }
}
