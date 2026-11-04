<?php

namespace App\Http\Resources;

use App\Models\Animal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SpeciesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $animal = $this->representativeAnimal();

        return [
            'id' => $this->id,
            'common_name' => $this->common_name,
            'scientific_name' => $this->scientific_name,
            'category' => $this->category,
            'distribution' => $this->distribution,
            'conservation_status' => $this->conservation_status,
            'habitat' => $this->habitat,
            'gestation_period' => $this->gestation_period,
            'size_cm' => $this->size_cm,
            'model_3d_path' => $this->model_3d_path,
            'photo_path' => $animal?->photo_path,
            'longevity' => $animal?->longevity,
            'diet' => $animal?->diet,
            'characteristics' => $animal?->characteristics,
            'zone_name' => $animal?->enclosure?->name,
        ];
    }

    private function representativeAnimal(): ?Animal
    {
        if (! $this->relationLoaded('animals')) {
            return null;
        }

        return $this->animals->firstWhere('photo_path', '!=', null)
            ?? $this->animals->first();
    }
}
