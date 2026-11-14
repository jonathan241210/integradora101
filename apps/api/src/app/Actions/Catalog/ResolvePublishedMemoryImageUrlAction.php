<?php

namespace App\Actions\Catalog;

use App\Actions\Media\ResolveMediaDiskAction;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ResolvePublishedMemoryImageUrlAction
{
    public function __construct(private readonly ResolveMediaDiskAction $disks) {}

    /**
     * URL pública de la imagen publicada o null (api-012 CA-06, CA-07).
     * Solo rutas relativas bajo memories/; el archivo debe existir en el disco público configurado.
     */
    public function execute(?string $publishedImagePath): ?string
    {
        if ($publishedImagePath === null
            || ! str_starts_with($publishedImagePath, 'memories/')
            || str_contains($publishedImagePath, '..')
            || str_contains($publishedImagePath, '\\')) {
            return null;
        }

        $name = $this->disks->publicDisk();

        if (empty(config("filesystems.disks.$name.url"))) {
            Log::error('Public media disk has no URL configured.', ['disk' => $name]);

            return null;
        }

        $disk = Storage::disk($name);

        return $disk->exists($publishedImagePath) ? $disk->url($publishedImagePath) : null;
    }
}
