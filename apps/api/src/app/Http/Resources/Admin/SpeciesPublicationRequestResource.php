<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Review list item (CA-05): effective values, no photo and no URL. */
class SpeciesPublicationRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'species_id' => $this->species_id,
            'common_name' => $this->species?->common_name,
            'scientific_name' => $this->scientific_name ?? $this->species?->scientific_name,
            'category' => $this->category ?? $this->species?->category,
            'request_type' => $this->request_type->value,
            'status' => $this->status->value,
            'publication_status' => $this->resource->getAttribute('publication_status')->value,
            'created_at' => $this->created_at?->toJSON(),
            'veterinarian_name' => $this->creator?->full_name,
        ];
    }
}
