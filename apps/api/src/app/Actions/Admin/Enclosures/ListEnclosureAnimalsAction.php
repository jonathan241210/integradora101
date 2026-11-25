<?php

namespace App\Actions\Admin\Enclosures;

use App\Models\Animal;
use App\Models\Enclosure;
use Illuminate\Database\Eloquent\Collection;

class ListEnclosureAnimalsAction
{
    /** @return Collection<int, Animal> */
    public function execute(Enclosure $enclosure): Collection
    {
        return $enclosure->animals()
            ->with('species:id,common_name')
            ->orderBy('name')
            ->orderBy('id')
            ->get(['id', 'name', 'species_id']);
    }
}
