<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Detalle y respuestas de decisión (api-010 CA-08). Nunca incluye image_path,
 * published_image_path, image_sha256 ni URL de imagen; la foto sale por admin.memories.image.
 */
class MemoryReviewDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'opinion' => $this->opinion,
            'created_at' => $this->created_at?->toIso8601String(),
            'resubmitted_count' => (int) $this->resubmitted_count,
            'rejection_reason' => $this->rejection_reason,
            'rejected_fields' => $this->rejectedFields(),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'published_at' => $this->published_at?->toIso8601String(),
            'published_until' => $this->published_until?->toIso8601String(),
            'is_published' => $this->isPublished(),
            'publication_days' => (int) config('memories.publication_days'),
        ];
    }
}
