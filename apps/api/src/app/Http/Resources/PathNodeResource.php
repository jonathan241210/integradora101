<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PathNodeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'name' => $this->name !== null ? (string) $this->name : null,
            'node_type' => (string) $this->node_type,
            'gps_lat' => $this->gps_lat !== null ? (float) $this->gps_lat : null,
            'gps_lon' => $this->gps_lon !== null ? (float) $this->gps_lon : null,
            'map_x' => $this->map_x !== null ? (float) $this->map_x : null,
            'map_y' => $this->map_y !== null ? (float) $this->map_y : null,
        ];
    }
}