<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\Admin\SpeciesPublication\Concerns\LocksSpeciesPublication;
use App\Actions\SpeciesPublication\Audit\LogSpeciesPublicationAction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RepublishSpeciesAction
{
    use LocksSpeciesPublication;

    public function __construct(private readonly LogSpeciesPublicationAction $audit) {}

    /** Restores the stored sheet of an unpublished species, without a new request (CA-36). */
    public function execute(User $admin, int $speciesId): void
    {
        DB::transaction(function () use ($admin, $speciesId): void {
            $species = $this->lockSpecies($speciesId);

            if ($species->is_published) {
                $this->fail('Esta especie ya está publicada.');
            }

            if ($species->unpublished_at === null) {
                $this->fail('Esta especie no tiene una ficha publicada para restaurar.');
            }

            if ($species->image_path === null || $species->published_fields === null) {
                $this->fail('No se puede republicar: faltan la foto o los datos publicados.');
            }

            if ($this->hasSubmittedRequest($species)) {
                $this->fail('Hay una solicitud pendiente para esta especie. Decide sobre ella antes de republicar.');
            }

            $species->is_published = true;
            $species->unpublished_at = null;
            $species->published_at = now();
            $species->save();

            $this->audit->execute(
                'species_publication.republished',
                'Especie republicada por '.$admin->full_name,
                $species,
            );
        });
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['species' => [$message]]);
    }
}
