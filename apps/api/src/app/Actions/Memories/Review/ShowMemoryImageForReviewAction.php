<?php

namespace App\Actions\Memories\Review;

use App\Actions\Media\ResolveMediaDiskAction;
use App\Models\VisitorMemory;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class ShowMemoryImageForReviewAction
{
    private const MIME = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
    ];

    /** Entrega el binario de la foto en revisión (CA-08). No cambia el estado. */
    public function execute(string $id): Response
    {
        abort_unless(ctype_digit($id), 404, 'Petición no encontrada.');

        $memory = VisitorMemory::query()->find((int) $id);
        abort_if($memory === null, 404, 'Petición no encontrada.');

        $path = $memory->image_path;
        $disk = Storage::disk(app(ResolveMediaDiskAction::class)->privateDisk());
        $contents = ($path !== null && $disk->exists($path)) ? $disk->get($path) : null;
        abort_if($contents === null, 404, 'La imagen ya no está disponible.');

        $mime = self::MIME[strtolower(pathinfo($path, PATHINFO_EXTENSION))] ?? 'application/octet-stream';

        return response($contents, 200, [
            'Content-Type' => $mime,
            'Cache-Control' => 'no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
