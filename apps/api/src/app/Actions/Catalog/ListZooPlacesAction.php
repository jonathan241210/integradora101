<?php

namespace App\Actions\Catalog;

use App\Models\ZooPlace;
use Illuminate\Database\Eloquent\Collection;

class ListZooPlacesAction
{
    /**
     * @return Collection<int, ZooPlace>
     */
    public function execute(): Collection
    {
        return ZooPlace::query()
            ->where('is_visible', true)
            ->orderBy('id')
            ->get();
    }
}