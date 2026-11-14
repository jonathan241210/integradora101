<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Item of the published and unpublished list (CA-40): no photo URL. */
class PublishedSpeciesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'common_name' => $this->common_name,
            'scientific_name' => $this->scientific_name,
            'category' => $this->category,
            'status' => $this->is_published ? 'published' : 'unpublished',
            'published_at' => $this->published_at?->toJSON(),
            'unpublished_at' => $this->unpublished_at?->toJSON(),
            'has_image' => $this->image_path !== null,
            'has_pending_request' => (bool) $this->resource->getAttribute('has_pending_request'),
        ];
    }
}
