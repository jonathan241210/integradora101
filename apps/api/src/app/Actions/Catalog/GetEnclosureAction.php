<?php

namespace App\Actions\Catalog;

use App\Models\Enclosure;

class GetEnclosureAction
{
    public function execute(int $id): ?Enclosure
    {
        return Enclosure::query()
            ->with(['animals.species'])
            ->withCount('animals')
            ->find($id);
    }
}
