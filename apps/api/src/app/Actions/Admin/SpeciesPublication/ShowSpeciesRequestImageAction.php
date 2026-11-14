<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\Media\ResolveMediaDiskAction;
use App\Models\SpeciesPublicationRequest;
use App\Support\SpeciesMedia;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Pending photo as a binary; the JSON never carries a URL (RN-08). */
class ShowSpeciesRequestImageAction
{
    public function __construct(private readonly ResolveMediaDiskAction $disks) {}

    public function execute(int $id): StreamedResponse
    {
        $path = SpeciesPublicationRequest::query()->whereKey($id)->value('image_path');

        abort_if($path === null || preg_match(SpeciesMedia::MANAGED_PATH_PATTERN, $path) !== 1, 404, 'Foto no encontrada.');

        $disk = Storage::disk($this->disks->privateDisk());
        abort_unless($disk->exists($path), 404, 'Foto no encontrada.');

        return $disk->response($path, null, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
