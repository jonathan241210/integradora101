<?php

namespace App\Actions\Catalog;

use App\Models\Enclosure;

class GetEnclosureAction
{
    public function execute(int $id): ?Enclosure
    {
        return Enclosure::query()
            ->where('is_active', 1)
            ->with(['animals' => fn ($query) => $query->publiclyVisible(), 'animals.species'])
            ->withCount(['animals' => fn ($query) => $query->publiclyVisible()])
            ->find($id);
    }
}
