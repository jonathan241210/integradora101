<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Request detail, current against proposed (CA-06). Never carries a photo URL (RN-08). */
class SpeciesPublicationRequestDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $species = $this->species;

        $model3d = $this->resource->getAttribute('model_3d_detection') ?? [
            'status' => 'missing',
            'detected_model_3d_path' => null,
            'model_3d_url' => null,
            'enabled' => (bool) ($species->model_3d_enabled ?? true),
            'can_toggle' => false,
        ];

        return [
            'id' => $this->id,
            'species_id' => $this->species_id,
            'status' => $this->status->value,
            'request_type' => $this->request_type->value,
            'created_at' => $this->created_at?->toJSON(),
            'veterinarian_name' => $this->creator?->full_name,
            'rejection_reason' => $this->rejection_reason,
            'published_fields' => $this->published_fields ?? [],
            'current' => [
                'common_name' => $species->common_name,
                'scientific_name' => $species->scientific_name,
                'habitat' => $species->habitat,
                'origin' => $species->distribution,
                'category' => $species->category,
                'fun_fact' => $species->fun_fact,
                'is_published' => (bool) $species->is_published,
                'published_at' => $species->published_at?->toJSON(),
                'publication_status' => $this->resource->getAttribute('publication_status')->value,
                'has_image' => $species->image_path !== null,
            ],
            'proposed' => [
                'scientific_name' => $this->scientific_name ?? $species->scientific_name,
                'habitat' => $this->habitat ?? $species->habitat,
                'origin' => $this->origin ?? $species->distribution,
                'category' => $this->category ?? $species->category,
                'fun_fact' => $this->fun_fact ?? $species->fun_fact,
                'published_fields' => $this->published_fields ?? [],
                'has_new_photo' => $this->image_path !== null,
            ],
            'model_3d' => [
                'status' => $model3d['status'],
                'detected_model_3d_path' => $model3d['detected_model_3d_path'],
                'model_3d_url' => $model3d['model_3d_url'],
                'enabled' => (bool) ($model3d['enabled'] ?? true),
                'can_toggle' => (bool) ($model3d['can_toggle'] ?? false),
            ],
        ];
    }
}
