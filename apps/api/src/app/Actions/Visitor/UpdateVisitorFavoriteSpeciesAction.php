<?php

namespace App\Actions\Visitor;

use App\Models\Species;
use App\Models\Visitor;
use App\Models\VisitorFavoriteSpecies;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;

class UpdateVisitorFavoriteSpeciesAction
{
    public function __construct(private readonly ListVisitorFavoriteSpeciesAction $list) {}

    /**
     * @return Collection<int, VisitorFavoriteSpecies>
     */
    public function execute(Visitor $visitor, int $speciesId, bool $favorite): Collection
    {
        if ($favorite) {
            $this->mark($visitor, $speciesId);
        } else {
            VisitorFavoriteSpecies::query()
                ->where('visitor_id', $visitor->id)
                ->where('species_id', $speciesId)
                ->delete();
        }

        return $this->list->execute($visitor);
    }

    private function mark(Visitor $visitor, int $speciesId): void
    {
        $visible = Species::query()
            ->whereKey($speciesId)
            ->where('is_published', 1)
            ->whereNull('deleted_at')
            ->exists();

        if (! $visible) {
            abort(404, 'Especie no encontrada.');
        }

        try {
            VisitorFavoriteSpecies::query()->firstOrCreate([
                'visitor_id' => $visitor->id,
                'species_id' => $speciesId,
            ]);
        } catch (UniqueConstraintViolationException) {
            // A concurrent mark already stored the pair.
        }
    }
}
