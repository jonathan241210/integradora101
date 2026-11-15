<?php

namespace App\Actions\SpeciesPublication\Media;

use App\Actions\Admin\Content\StripImageMetadataAction;
use App\Actions\Media\ResolveMediaDiskAction;
use App\Support\SpeciesMedia;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class StoreSpeciesImageAction
{
    public function __construct(
        private readonly StripImageMetadataAction $strip,
        private readonly ResolveMediaDiskAction $disks,
    ) {}

    /**
     * Stores a photo as <folder>/<uuid>.<ext> (pending folder by default; CA-37 writes straight to the
     * public folder). The name never comes from the client.
     */
    public function execute(UploadedFile $file, string $folder = SpeciesMedia::PENDING_FOLDER): string
    {
        $extension = match ($file->getMimeType()) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            default => throw new RuntimeException('Unsupported image type.'),
        };

        $name = Str::uuid()->toString().'.'.$extension;

        $raw = @file_get_contents($file->getRealPath());

        if ($raw === false || $raw === '') {
            throw new RuntimeException('The photo could not be read.');
        }

        // ADR 0026: metadata (EXIF/GPS) is removed before writing.
        $clean = $this->strip->execute($raw, (string) $file->getMimeType());

        $diskName = $folder === SpeciesMedia::PUBLIC_FOLDER ? $this->disks->publicDisk() : $this->disks->privateDisk();
        $stored = Storage::disk($diskName)->put($folder.'/'.$name, $clean);

        if ($stored === false) {
            throw new RuntimeException('The photo could not be stored.');
        }

        return $folder.'/'.$name;
    }
}
