<?php

namespace App\Http\Resources\Veterinarian;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** 201 response of the submission (CA-02): no photo URL. */
class SubmittedSpeciesPublicationRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'species_id' => $this->species_id,
            'status' => $this->status->value,
            'request_type' => $this->request_type->value,
            'created_at' => $this->created_at?->toJSON(),
        ];
    }
}
