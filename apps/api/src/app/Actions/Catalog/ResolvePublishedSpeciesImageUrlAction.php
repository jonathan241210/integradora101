<?php

namespace App\Actions\Catalog;

use App\Actions\Media\ResolveMediaDiskAction;
use Illuminate\Support\Facades\Storage;

/**
 * Single reader of species.image_path for the public API (api-015 RN-07).
 */
class ResolvePublishedSpeciesImageUrlAction
{
    public function __construct(private readonly ResolveMediaDiskAction $disks) {}

    public function execute(?string $imagePath): ?string
    {
        if ($imagePath === null || $imagePath === ''
            || ! str_starts_with($imagePath, 'species/')
            || str_contains($imagePath, '..')
            || str_contains($imagePath, '\\')) {
            return null;
        }

        $disk = Storage::disk($this->disks->publicDisk());

        return $disk->exists($imagePath) ? $disk->url($imagePath) : null;
    }
}
