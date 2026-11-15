<?php

namespace App\Actions\Admin\Content;

use App\Actions\Media\ResolveMediaDiskAction;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class StoreContentImageAction
{
    private const EXTENSIONS = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    private ResolveMediaDiskAction $disks;

    public function __construct(private StripImageMetadataAction $stripMetadata, ?ResolveMediaDiskAction $disks = null)
    {
        $this->disks = $disks ?? new ResolveMediaDiskAction;
    }

    /**
     * Guarda el archivo sin metadatos ni HDR en el disco público configurado y devuelve la ruta relativa (CA-14, CA-15).
     *
     * @param  'news'|'events'  $folder
     */
    public function execute(UploadedFile $image, string $folder): string
    {
        $mimeType = (string) $image->getMimeType();
        $extension = self::EXTENSIONS[$mimeType] ?? 'jpg';
        $path = $folder.'/'.Str::uuid()->toString().'.'.$extension;

        $clean = $this->stripMetadata->execute((string) $image->get(), $mimeType);
        $stored = Storage::disk($this->disks->publicDisk())->put($path, $clean);

        if ($stored === false) {
            throw new RuntimeException('No se pudo guardar la imagen.');
        }

        return $path;
    }
}
