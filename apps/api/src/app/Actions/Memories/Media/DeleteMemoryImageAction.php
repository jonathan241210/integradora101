<?php

namespace App\Actions\Memories\Media;

use App\Actions\Media\ResolveMediaDiskAction;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Borra del disco privado el archivo de un momento (api-010 CA-29, api-013 CA-18).
 * Solo rutas gestionadas; nunca registra la ruta. Llamar después del commit.
 */
class DeleteMemoryImageAction
{
    private const MANAGED_PATH = '#^memories/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$#';

    public function execute(?string $path): bool
    {
        if ($path === null || preg_match(self::MANAGED_PATH, $path) !== 1) {
            Log::warning('Se ignoró el borrado de una imagen de momento con ruta fuera del patrón gestionado.');

            return false;
        }

        try {
            $deleted = Storage::disk(app(ResolveMediaDiskAction::class)->privateDisk())->delete($path);
        } catch (Throwable) {
            $deleted = false;
        }

        if (! $deleted) {
            Log::error('No se pudo borrar la imagen de un momento; el archivo queda huérfano.');
        }

        return $deleted;
    }
}
