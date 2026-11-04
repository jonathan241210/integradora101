<?php

namespace App\Actions\Admin\Content;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class DeleteContentImageAction
{
    public function __construct(private ResolveContentImageUrlAction $resolver) {}

    /** Borra el archivo solo si la ruta es gestionada (CA-08). */
    public function execute(?string $path): void
    {
        if (! $this->resolver->isManaged($path)) {
            return;
        }

        try {
            if (! Storage::disk('public')->delete($path)) {
                Log::warning('No se pudo borrar un archivo de imagen.', ['path' => $path]);
            }
        } catch (Throwable $e) {
            Log::warning('No se pudo borrar un archivo de imagen.', ['path' => $path]);
        }
    }
}
