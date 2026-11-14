<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\Media\ResolveMediaDiskAction;
use App\Models\Species;
use App\Support\SpeciesMedia;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Published photo as a binary; the JSON never carries a URL (RN-08, CA-40). */
class ShowSpeciesImageAction
{
    public function __construct(private readonly ResolveMediaDiskAction $disks) {}

    public function execute(int $id): StreamedResponse
    {
        $path = Species::query()->whereKey($id)->value('image_path');

        abort_if($path === null || preg_match(SpeciesMedia::MANAGED_PATH_PATTERN, $path) !== 1, 404, 'Foto no encontrada.');

        $disk = Storage::disk($this->disks->publicDisk());
        abort_unless($disk->exists($path), 404, 'Foto no encontrada.');

        return $disk->response($path, null, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
