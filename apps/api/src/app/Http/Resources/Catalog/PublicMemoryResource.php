<?php

namespace App\Http\Resources\Catalog;

use App\Actions\Catalog\ResolvePublishedMemoryImageUrlAction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicMemoryResource extends JsonResource
{
    /** Lista blanca de campos públicos (api-012 RN-05). */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'opinion' => $this->opinion,
            'image_url' => app(ResolvePublishedMemoryImageUrlAction::class)->execute($this->published_image_path),
            'published_at' => $this->published_at?->copy()->utc()->toIso8601String(),
        ];
    }
}
