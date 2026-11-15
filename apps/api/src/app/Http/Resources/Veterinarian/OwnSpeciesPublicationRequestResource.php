<?php

namespace App\Http\Resources\Veterinarian;

use App\Enums\SpeciesRequestStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** "Mis solicitudes" item (CA-33): no photos and no reviewer identity. */
class OwnSpeciesPublicationRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'species_id' => $this->species_id,
            'common_name' => $this->species?->common_name,
            'request_type' => $this->request_type->value,
            'status' => $this->status->value,
            'created_at' => $this->created_at?->toJSON(),
            'reviewed_at' => $this->reviewed_at?->toJSON(),
            'rejection_reason' => $this->status === SpeciesRequestStatus::Rejected ? $this->rejection_reason : null,
            'species_publication_status' => $this->resource->getAttribute('species_publication_status')->value,
        ];
    }
}
