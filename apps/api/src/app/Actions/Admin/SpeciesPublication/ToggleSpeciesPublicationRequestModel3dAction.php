<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\Admin\SpeciesPublication\Concerns\LocksSpeciesPublication;
use App\Actions\SpeciesPublication\Audit\LogSpeciesPublicationAction;
use App\Models\SpeciesPublicationRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ToggleSpeciesPublicationRequestModel3dAction
{
    use LocksSpeciesPublication;

    public function __construct(
        private readonly ResolveSpeciesModel3dDetectionAction $detectModel3d,
        private readonly LogSpeciesPublicationAction $audit,
    ) {}

    public function execute(User $actor, int $requestId, bool $enabled): void
    {
        DB::transaction(function () use ($actor, $requestId, $enabled): void {
            $request = SpeciesPublicationRequest::query()
                ->lockForUpdate()
                ->with('species')
                ->find($requestId);

            if ($request === null || $request->species === null) {
                abort(404, 'Solicitud no encontrada.');
            }

            $species = $this->lockSpecies($request->species_id);

            $detection = $this->detectModel3d->execute(
                $species->common_name,
                $species->model_3d_path,
                (bool) ($species->model_3d_enabled ?? true),
            );

            if (($detection['status'] ?? 'missing') === 'missing') {
                throw ValidationException::withMessages([
                    'model_3d' => ['No hay modelo 3D disponible para esta especie.'],
                ]);
            }

            $old = (bool) ($species->model_3d_enabled ?? true);
            $species->model_3d_enabled = $enabled;
            $species->save();

            $this->audit->execute(
                'species.model_3d_toggled',
                ($enabled ? 'Modelo 3D activado' : 'Modelo 3D desactivado').' por '.$actor->full_name,
                $species,
                [
                    'request_id' => $request->id,
                    'model_3d_enabled' => ['old' => $old, 'new' => $enabled],
                ],
            );
        });
    }
}