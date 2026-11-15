<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\Admin\SpeciesPublication\Concerns\LocksSpeciesPublication;
use App\Actions\SpeciesPublication\Audit\LogSpeciesPublicationAction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UnpublishSpeciesAction
{
    use LocksSpeciesPublication;

    public function __construct(private readonly LogSpeciesPublicationAction $audit) {}

    /** Hides a published species without deleting anything (CA-35). */
    public function execute(User $admin, int $speciesId): void
    {
        DB::transaction(function () use ($admin, $speciesId): void {
            $species = $this->lockSpecies($speciesId);

            if (! $species->is_published) {
                throw ValidationException::withMessages(['species' => ['Esta especie no está publicada.']]);
            }

            $species->is_published = false;
            $species->unpublished_at = now();
            $species->save();

            $this->audit->execute(
                'species_publication.unpublished',
                'Especie despublicada por '.$admin->full_name,
                $species,
            );
        });
    }
}
