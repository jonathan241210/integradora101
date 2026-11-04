<?php

namespace App\Actions\Admin\Content;

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

    /**
     * Guarda el archivo en el disco public y devuelve la ruta relativa.
     *
     * @param  'news'|'events'  $folder
     */
    public function execute(UploadedFile $image, string $folder): string
    {
        $extension = self::EXTENSIONS[$image->getMimeType()] ?? 'jpg';
        $path = $folder.'/'.Str::uuid()->toString().'.'.$extension;

        $stored = Storage::disk('public')->putFileAs($folder, $image, basename($path));

        if ($stored === false) {
            throw new RuntimeException('No se pudo guardar la imagen.');
        }

        return $path;
    }
}
