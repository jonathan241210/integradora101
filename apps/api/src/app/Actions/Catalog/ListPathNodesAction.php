<?php

namespace App\Actions\Catalog;

use App\Models\PathNode;
use Illuminate\Database\Eloquent\Collection;

class ListPathNodesAction
{
    /**
     * @return Collection<int, PathNode>
     */
    public function execute(): Collection
    {
        return PathNode::query()
            ->orderBy('id')
            ->get();
    }
}