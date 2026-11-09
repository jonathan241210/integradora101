<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EnclosureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'gps_lat' => $this->gps_lat !== null ? (float) $this->gps_lat : null,
            'gps_lon' => $this->gps_lon !== null ? (float) $this->gps_lon : null,
            'map_x' => $this->map_x !== null ? (float) $this->map_x : null,
            'map_y' => $this->map_y !== null ? (float) $this->map_y : null,
            'animals_count' => (int) ($this->animals_count ?? 0),
        ];
    }
}
