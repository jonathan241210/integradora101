<?php

namespace App\Actions\Catalog;

use App\Models\Enclosure;
use Illuminate\Database\Eloquent\Collection;

class ListEnclosuresAction
{
    /**
     * @return Collection<int, Enclosure>
     */
    public function execute(): Collection
    {
        return Enclosure::query()
            ->with(['animals.species'])
            ->withCount('animals')
            ->orderBy('id')
            ->get();
    }
}
