<?php

namespace App\Actions\Media;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Deletes a managed media file. Call it only after the database commit (api-013, RN-10, D-P4).
 * Failures are logged with the relative path and never thrown to the caller.
 */
class DeleteMediaFileAfterCommitAction
{
    private const PATTERN = '#^(news|events|memories|species|species-requests)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$#D';

    public function __construct(private ?ResolveMediaDiskAction $disks = null)
    {
        $this->disks ??= new ResolveMediaDiskAction;
    }

    /** @param  'public'|'private'  $scope */
    public function execute(?string $path, string $scope = ResolveMediaDiskAction::SCOPE_PUBLIC): void
    {
        if ($path === null || ! $this->isAllowed($path)) {
            if ($path !== null && $path !== '') {
                Log::warning('Se omitió el borrado de una ruta de imagen no permitida.', ['path' => $path]);
            }

            return;
        }

        try {
            if (! Storage::disk($this->disks->forScope($scope))->delete($path)) {
                Log::warning('No se pudo borrar un archivo de imagen.', ['path' => $path]);
            }
        } catch (Throwable $e) {
            Log::warning('No se pudo borrar un archivo de imagen.', ['path' => $path]);
        }
    }

    public function isAllowed(string $path): bool
    {
        return ! str_contains($path, '..')
            && ! str_contains($path, '\\')
            && ! str_starts_with($path, '/')
            && preg_match(self::PATTERN, $path) === 1;
    }
}
