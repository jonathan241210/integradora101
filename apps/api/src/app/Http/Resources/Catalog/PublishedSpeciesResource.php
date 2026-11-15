<?php

namespace App\Http\Resources\Catalog;

use App\Actions\Catalog\ResolvePublishedSpeciesImageUrlAction;
use App\Models\Species;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Whitelist serializer for published species (api-015 RN-06, RN-08).
 *
 * @mixin Species
 */
class PublishedSpeciesResource extends JsonResource
{
    /** Published field key => species column. */
    private const FIELD_COLUMNS = [
        'scientific_name' => 'scientific_name',
        'origin' => 'distribution',
        'habitat' => 'habitat',
    ];

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $published = is_array($this->published_fields) ? $this->published_fields : [];

        $data = [
            'id' => $this->id,
            'common_name' => $this->common_name,
            'category' => $this->category,
            'image_url' => app(ResolvePublishedSpeciesImageUrlAction::class)->execute($this->image_path),
        ];

        foreach (self::FIELD_COLUMNS as $key => $column) {
            if (in_array($key, $published, true)) {
                $data[$key] = $this->{$column};
            }
        }

        return $data;
    }
}
