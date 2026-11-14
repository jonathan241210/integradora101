<?php

namespace App\Http\Resources\Veterinarian;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SelectableSpeciesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $status = $this->resource->getAttribute('publication_status');

        return [
            'id' => $this->id,
            'common_name' => $this->common_name,
            'scientific_name' => $this->scientific_name,
            'habitat' => $this->habitat,
            'origin' => $this->distribution,
            'category' => $this->category,
            'publication_status' => $status->value,
            'next_request_type' => $status->nextRequestType()?->value,
            'last_rejection_reason' => $this->resource->getAttribute('last_rejection_reason'),
        ];
    }
}
