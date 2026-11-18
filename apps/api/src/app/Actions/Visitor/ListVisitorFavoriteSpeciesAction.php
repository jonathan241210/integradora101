<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use App\Models\VisitorFavoriteSpecies;
use Illuminate\Database\Eloquent\Collection;

class ListVisitorFavoriteSpeciesAction
{
    /**
     * Visible species use the same two conditions as the public catalog (api-015).
     *
     * @return Collection<int, VisitorFavoriteSpecies>
     */
    public function execute(Visitor $visitor): Collection
    {
        return VisitorFavoriteSpecies::query()
            ->where('visitor_id', $visitor->id)
            ->whereHas('species', function ($query): void {
                $query->where('is_published', 1)->whereNull('deleted_at');
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();
    }
}
