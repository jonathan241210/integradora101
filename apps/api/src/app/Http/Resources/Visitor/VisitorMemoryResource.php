<?php

namespace App\Http\Resources\Visitor;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Petición propia del visitante (api-010 CA-01, CA-06). Sin URL ni ruta de imagen, sin hash,
 * sin visitor_id y sin datos del revisor.
 */
class VisitorMemoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'status' => $this->status,
            'opinion' => $this->opinion,
            'created_at' => $this->created_at?->toIso8601String(),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'resubmitted_count' => (int) $this->resubmitted_count,
        ];

        if ($this->status === 'rejected') {
            $data['rejection_reason'] = $this->rejection_reason;
            $data['rejected_fields'] = $this->rejectedFields();
        }

        if ($this->status === 'accepted') {
            $data['published_until'] = $this->published_until?->toIso8601String();
            $data['is_published'] = $this->isPublished();
        }

        return $data;
    }
}
