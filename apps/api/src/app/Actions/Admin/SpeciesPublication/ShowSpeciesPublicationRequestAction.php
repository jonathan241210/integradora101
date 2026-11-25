<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\SpeciesPublication\DeriveSpeciesPublicationStatusAction;
use App\Models\SpeciesPublicationRequest;

class ShowSpeciesPublicationRequestAction
{
    public function __construct(
        private readonly DeriveSpeciesPublicationStatusAction $derive,
        private readonly ResolveSpeciesModel3dDetectionAction $detectModel3d,
    ) {}

    /** Request with its species and the derived `publication_status` of that species (CA-06),
     * computed without counting the request itself (G-1 to G-3). */
    public function execute(int $id): SpeciesPublicationRequest
    {
        $request = SpeciesPublicationRequest::query()->with(['species', 'creator'])->find($id);

        if ($request === null || $request->species === null) {
            abort(404, 'Solicitud no encontrada.');
        }

        $request->setAttribute('publication_status', $this->derive->execute($request->species, false));
        $request->setAttribute(
            'model_3d_detection',
            $this->detectModel3d->execute(
                $request->species->common_name,
                $request->species->model_3d_path,
                (bool) ($request->species->model_3d_enabled ?? true),
            ),
        );

        return $request;
    }
}
