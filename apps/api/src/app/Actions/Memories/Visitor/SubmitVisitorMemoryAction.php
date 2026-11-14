<?php

namespace App\Actions\Memories\Visitor;

use App\Actions\Memories\Media\DeleteMemoryImageAction;
use App\Actions\Memories\Media\StoreMemoryImageAction;
use App\Enums\MemoryStatus;
use App\Models\Visitor;
use App\Models\VisitorMemory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Envío de un momento nuevo (api-010 CA-01, CA-23 a CA-25). El retiro de metadatos y el hash van
 * antes de la transacción (D-M8); dentro se bloquea la fila del visitante, se comprueban los límites,
 * se escribe el archivo y se inserta la petición (D-M6). Si algo falla, se borra el archivo nuevo.
 */
class SubmitVisitorMemoryAction
{
    public function __construct(
        private readonly StoreMemoryImageAction $images,
        private readonly DeleteMemoryImageAction $deleteImage,
        private readonly ResolveVisitorMemoryLimitsAction $limits,
    ) {}

    public function execute(Visitor $visitor, UploadedFile $file, ?string $opinion): VisitorMemory
    {
        $prepared = $this->images->prepare($file);
        $path = null;

        try {
            return DB::transaction(function () use ($visitor, $prepared, $opinion, &$path) {
                Visitor::query()->whereKey($visitor->id)->lockForUpdate()->firstOrFail();

                $this->limits->assertCanSubmit($visitor->id);

                $path = $this->images->store($prepared);

                $memory = new VisitorMemory([
                    'visitor_id' => $visitor->id,
                    'opinion' => $opinion,
                    'image_path' => $path,
                    'image_sha256' => $prepared['sha256'],
                    'consent_at' => now(),
                    'terms_version' => config('memories.terms_version'),
                ]);
                $memory->forceFill([
                    'status' => MemoryStatus::Submitted->value,
                    'resubmitted_count' => 0,
                ])->save();

                return $memory->refresh();
            });
        } catch (Throwable $e) {
            if ($path !== null) {
                $this->deleteImage->execute($path);
            }

            throw $e;
        }
    }
}
