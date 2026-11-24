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
            ->where('is_active', 1)
            ->with(['animals' => fn ($query) => $query->publiclyVisible(), 'animals.species'])
            ->withCount(['animals' => fn ($query) => $query->publiclyVisible()])
            ->orderBy('id')
            ->get();
    }
}
