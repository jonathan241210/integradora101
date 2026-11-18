<?php

namespace App\Http\Resources\Visitor;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VisitorFavoriteSpeciesResource extends JsonResource
{
    /**
     * @return array{id: int}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->species_id,
        ];
    }
}
