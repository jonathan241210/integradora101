<?php

namespace App\Actions\Admin\SpeciesPublication\Concerns;

use App\Enums\SpeciesRequestStatus;
use App\Models\Species;
use App\Models\SpeciesPublicationRequest;
use Illuminate\Validation\ValidationException;

/** Lock order shared by every publication action: species first, then its request (RN-11, CA-41). */
trait LocksSpeciesPublication
{
    protected const REVIEWED_MESSAGE = 'Esta solicitud ya fue revisada.';

    /** @return array{0: Species, 1: SpeciesPublicationRequest} */
    protected function lockRequest(int $requestId): array
    {
        $speciesId = SpeciesPublicationRequest::query()->whereKey($requestId)->value('species_id');

        if ($speciesId === null) {
            abort(404, 'Solicitud no encontrada.');
        }

        $species = Species::query()->lockForUpdate()->find($speciesId);

        if ($species === null) {
            abort(404, 'Solicitud no encontrada.');
        }

        $request = SpeciesPublicationRequest::query()->lockForUpdate()->find($requestId);

        if ($request === null) {
            abort(404, 'Solicitud no encontrada.');
        }

        return [$species, $request];
    }

    protected function lockSpecies(int $speciesId): Species
    {
        return Species::query()->lockForUpdate()->find($speciesId)
            ?? abort(404, 'Especie no encontrada.');
    }

    protected function assertSubmitted(SpeciesPublicationRequest $request): void
    {
        if ($request->status !== SpeciesRequestStatus::Submitted) {
            throw ValidationException::withMessages(['status' => [self::REVIEWED_MESSAGE]]);
        }
    }

    protected function hasSubmittedRequest(Species $species): bool
    {
        return SpeciesPublicationRequest::query()
            ->where('species_id', $species->id)
            ->where('status', SpeciesRequestStatus::Submitted->value)
            ->exists();
    }
}
