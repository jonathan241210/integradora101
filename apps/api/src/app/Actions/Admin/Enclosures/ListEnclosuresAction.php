<?php

namespace App\Actions\Admin\Enclosures;

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
            ->withCount('animals')
            ->orderBy('name')
            ->orderBy('id')
            ->get();
    }
}
