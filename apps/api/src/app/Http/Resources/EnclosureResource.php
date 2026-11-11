<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EnclosureResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'name' => (string) $this->name,
            'gps_lat' => $this->gps_lat !== null ? (float) $this->gps_lat : null,
            'gps_lon' => $this->gps_lon !== null ? (float) $this->gps_lon : null,
            'map_x' => $this->map_x !== null ? (float) $this->map_x : null,
            'map_y' => $this->map_y !== null ? (float) $this->map_y : null,
            'animals_count' => (int) ($this->animals_count ?? ($this->relationLoaded('animals') ? $this->animals->count() : 0)),
            'animals' => $this->relationLoaded('animals')
                ? $this->animals->map(fn ($animal) => [
                    'id' => (int) $animal->id,
                    'name' => (string) $animal->name,
                    'sex' => (string) ($animal->sex ?? ''),
                    'age' => (string) ($animal->age ?? $animal->approximate_age ?? ''),
                    'origin' => (string) ($animal->origin ?? ''),
                    'longevity' => (string) ($animal->longevity ?? ''),
                    'diet' => (string) ($animal->diet ?? ''),
                    'reproduction' => (string) ($animal->reproduction ?? ''),
                    'characteristics' => (string) ($animal->characteristics ?? ''),
                    'photo_path' => $animal->photo_path ? (string) $animal->photo_path : null,
                    'stay_status' => (string) ($animal->stay_status ?? ''),
                    'can_receive_visits' => (bool) ($animal->can_receive_visits ?? true),
                    'species_id' => $animal->species_id !== null ? (int) $animal->species_id : null,
                    'species_name' => $animal->relationLoaded('species') && $animal->species !== null
                        ? (string) $animal->species->common_name
                        : null,
                    'scientific_name' => $animal->relationLoaded('species') && $animal->species !== null
                        ? (string) $animal->species->scientific_name
                        : null,
                    'species' => $animal->relationLoaded('species') && $animal->species !== null
                        ? [
                            'id' => (int) $animal->species->id,
                            'common_name' => (string) $animal->species->common_name,
                            'scientific_name' => (string) $animal->species->scientific_name,
                            'category' => (string) ($animal->species->category ?? ''),
                            'distribution' => (string) ($animal->species->distribution ?? ''),
                            'conservation_status' => (string) ($animal->species->conservation_status ?? ''),
                            'habitat' => (string) ($animal->species->habitat ?? ''),
                            'gestation_period' => (string) ($animal->species->gestation_period ?? ''),
                            'size_cm' => $animal->species->size_cm !== null ? (float) $animal->species->size_cm : null,
                            'model_3d_path' => $animal->species->model_3d_path ? (string) $animal->species->model_3d_path : null,
                        ]
                        : null,
                ])->values()->all()
                : [],
        ];
    }
}
