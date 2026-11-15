<?php

namespace App\Actions\Memories\Media;

use App\Actions\Admin\Content\StripImageMetadataAction;
use App\Actions\Media\ResolveMediaDiskAction;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

/**
 * Prepara (retira metadatos, SHA-256 del archivo limpio, nombre generado) y escribe la imagen
 * de un momento en el disco privado (api-010 RN-05, RN-16; api-013 CA-08, CA-09).
 */
class StoreMemoryImageAction
{
    private const EXTENSIONS = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    private const ERROR = 'No se pudo procesar la foto. Intenta con otro archivo.';

    public function __construct(private readonly StripImageMetadataAction $strip) {}

    /**
     * Sin I/O de escritura: va antes de la transacción (D-M8).
     *
     * @return array{bytes: string, extension: string, sha256: string}
     */
    public function prepare(UploadedFile $file): array
    {
        $mime = (string) $file->getMimeType();
        $raw = @file_get_contents($file->getRealPath());

        if (! isset(self::EXTENSIONS[$mime]) || $raw === false || $raw === '') {
            $this->unprocessable();
        }

        try {
            $clean = $this->strip->execute($raw, $mime);
        } catch (ValidationException) {
            $this->unprocessable();
        }

        return ['bytes' => $clean, 'extension' => self::EXTENSIONS[$mime], 'sha256' => hash('sha256', $clean)];
    }

    /**
     * @param  array{bytes: string, extension: string, sha256: string}  $prepared
     * @return string ruta relativa `memories/<uuid>.<ext>`
     */
    public function store(array $prepared): string
    {
        $path = 'memories/'.Str::uuid().'.'.$prepared['extension'];

        try {
            $written = Storage::disk(app(ResolveMediaDiskAction::class)->privateDisk())->put($path, $prepared['bytes']);
        } catch (Throwable) {
            $written = false;
        }

        if (! $written) {
            Log::error('No se pudo escribir la imagen de un momento.');

            throw new RuntimeException('No se pudo guardar la imagen del momento.');
        }

        return $path;
    }

    /** @return array{path: string, sha256: string} */
    public function execute(UploadedFile $file): array
    {
        $prepared = $this->prepare($file);

        return ['path' => $this->store($prepared), 'sha256' => $prepared['sha256']];
    }

    private function unprocessable(): never
    {
        throw ValidationException::withMessages(['image' => self::ERROR]);
    }
}
