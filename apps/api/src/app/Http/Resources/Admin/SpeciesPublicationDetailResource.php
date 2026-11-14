<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Publication detail of a species (CA-37, GET shape). No photo URL (RN-08). */
class SpeciesPublicationDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'common_name' => $this->common_name,
            'scientific_name' => $this->scientific_name,
            'habitat' => $this->habitat,
            'origin' => $this->distribution,
            'category' => $this->category,
            'publication_status' => $this->resource->getAttribute('publication_status')->value,
            'is_published' => (bool) $this->is_published,
            'published_at' => $this->published_at?->toJSON(),
            'unpublished_at' => $this->unpublished_at?->toJSON(),
            'published_fields' => $this->published_fields ?? [],
            'has_image' => $this->image_path !== null,
            'has_pending_request' => (bool) $this->resource->getAttribute('has_pending_request'),
        ];
    }
}
