<?php

namespace App\Actions\Catalog;

use App\Actions\Media\ResolveMediaDiskAction;
use Illuminate\Support\Facades\Storage;

/**
 * Single reader of species.model_3d_path for the public API (api-031).
 */
class ResolvePublishedSpeciesModel3dUrlAction
{
    public function __construct(private readonly ResolveMediaDiskAction $disks) {}

    public function execute(?string $model3dPath, bool $model3dEnabled = true): ?string
    {
        if (! $model3dEnabled) {
            return null;
        }

        if ($model3dPath === null || $model3dPath === ''
            || ! str_starts_with($model3dPath, 'models/')
            || ! str_ends_with(strtolower($model3dPath), '.glb')
            || str_contains($model3dPath, '..')
            || str_contains($model3dPath, '\\')) {
            return null;
        }

        $disk = Storage::disk($this->disks->publicDisk());

        if (! $disk->exists($model3dPath)) {
            return null;
        }

        $url = $disk->url($model3dPath);
        $path = parse_url((string) $url, PHP_URL_PATH);

        return is_string($path) && $path !== '' ? $path : $url;
    }
}
