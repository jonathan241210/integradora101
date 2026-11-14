<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Fila de la lista de revisión (api-010 CA-07). Sin URL de imagen ni datos del visitante. */
class MemoryReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'opinion' => $this->opinion,
            'created_at' => $this->created_at?->toIso8601String(),
            'resubmitted_count' => (int) $this->resubmitted_count,
        ];
    }
}
