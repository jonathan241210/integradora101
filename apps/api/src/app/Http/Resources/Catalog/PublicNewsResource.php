<?php

namespace App\Http\Resources\Catalog;

use App\Actions\Admin\Content\ResolveContentImageUrlAction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicNewsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'published_date' => $this->published_date?->toDateString(),
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'image_url' => app(ResolveContentImageUrlAction::class)->execute($this->image_path),
        ];
    }
}
