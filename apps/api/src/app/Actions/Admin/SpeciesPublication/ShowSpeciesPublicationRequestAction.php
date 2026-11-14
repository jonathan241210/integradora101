<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\SpeciesPublication\DeriveSpeciesPublicationStatusAction;
use App\Models\SpeciesPublicationRequest;

class ShowSpeciesPublicationRequestAction
{
    public function __construct(private readonly DeriveSpeciesPublicationStatusAction $derive) {}

    /** Request with its species and the derived `publication_status` of that species (CA-06),
     * computed without counting the request itself (G-1 to G-3). */
    public function execute(int $id): SpeciesPublicationRequest
    {
        $request = SpeciesPublicationRequest::query()->with(['species', 'creator'])->find($id);

        if ($request === null || $request->species === null) {
            abort(404, 'Solicitud no encontrada.');
        }

        $request->setAttribute('publication_status', $this->derive->execute($request->species, false));

        return $request;
    }
}
