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
            'id' => (int) $this->id,
            'common_name' => (string) $this->common_name,
            'scientific_name' => $this->scientific_name !== null ? (string) $this->scientific_name : null,
            'category' => $this->category ?? null,
            'distribution' => $this->distribution ?? null,
            'conservation_status' => $this->conservation_status ?? null,
            'habitat' => $this->habitat ?? null,
            'feeding' => $this->feeding ?? null,
            'longevity' => $this->longevity ?? null,
            'reproduction' => $this->reproduction ?? null,
            'gestation_period' => $this->gestation_period ?? null,
            'size_cm' => $this->size_cm !== null ? (float) $this->size_cm : null,
            'model_3d_path' => $this->model_3d_path ?? null,
            'photo_path' => $animal?->photo_path,
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
