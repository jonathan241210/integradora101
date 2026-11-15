<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\SpeciesPublication\DeriveSpeciesPublicationStatusAction;
use App\Enums\SpeciesRequestStatus;
use App\Models\Species;
use App\Models\SpeciesPublicationRequest;

class ShowSpeciesPublicationAction
{
    public function __construct(private readonly DeriveSpeciesPublicationStatusAction $derive) {}

    /** Publication detail of a species (CA-37). Adds `publication_status` and `has_pending_request`. */
    public function execute(int $id): Species
    {
        $species = Species::query()->find($id) ?? abort(404, 'Especie no encontrada.');

        $pending = SpeciesPublicationRequest::query()
            ->where('species_id', $species->id)
            ->where('status', SpeciesRequestStatus::Submitted->value)
            ->exists();

        $species->setAttribute('has_pending_request', $pending);
        $species->setAttribute('publication_status', $this->derive->execute($species, $pending));

        return $species;
    }
}
