<?php

namespace App\Actions\Memories\Visitor;

use App\Actions\Memories\Media\DeleteMemoryImageAction;
use App\Actions\Memories\Media\StoreMemoryImageAction;
use App\Enums\MemoryStatus;
use App\Models\Visitor;
use App\Models\VisitorMemory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Corrección y reenvío de una rechazada (api-010 CA-26, CA-27, RN-19). No abre ni cuenta la ventana semanal.
 */
class ResubmitVisitorMemoryAction
{
    public function __construct(
        private readonly StoreMemoryImageAction $images,
        private readonly DeleteMemoryImageAction $deleteImage,
    ) {}

    public function execute(Visitor $visitor, string $id, ?UploadedFile $file, ?string $opinion): VisitorMemory
    {
        abort_unless(ctype_digit($id), 404, 'Petición no encontrada.');

        // Lectura sin bloqueo: una ajena responde 404 antes de procesar la imagen.
        abort_if(
            ! VisitorMemory::query()->where('visitor_id', $visitor->id)->whereKey((int) $id)->exists(),
            404,
            'Petición no encontrada.',
        );

        $prepared = $file !== null ? $this->images->prepare($file) : null;
        $newPath = null;

        try {
            return DB::transaction(function () use ($visitor, $id, $prepared, $opinion, &$newPath) {
                $memory = VisitorMemory::query()
                    ->where('visitor_id', $visitor->id)
                    ->lockForUpdate()
                    ->find((int) $id);
                abort_if($memory === null, 404, 'Petición no encontrada.');

                if ($memory->status !== MemoryStatus::Rejected->value) {
                    throw ValidationException::withMessages(['status' => 'Solo puedes corregir una petición rechazada.']);
                }

                $this->assertCorrection($memory, $prepared, $opinion);

                $oldPath = null;
                if ($prepared !== null) {
                    $oldPath = $memory->image_path;
                    $newPath = $this->images->store($prepared);
                    $memory->image_path = $newPath;
                    $memory->image_sha256 = $prepared['sha256'];
                }

                if ($opinion !== null) {
                    $memory->opinion = $opinion; // D-M12: sin opinión nueva se conserva la guardada.
                }

                $memory->forceFill([
                    'status' => MemoryStatus::Submitted->value,
                    'resubmitted_count' => (int) $memory->resubmitted_count + 1,
                    'rejection_reason' => null,
                    'rejected_image' => false,
                    'rejected_content' => false,
                    'consent_at' => now(),
                    'terms_version' => config('memories.terms_version'),
                ])->save();

                activity('visitor-memories')
                    ->causedBy($visitor)
                    ->performedOn($memory)
                    ->event('resubmitted')
                    ->withProperties(['memory_id' => $memory->id, 'image_replaced' => $prepared !== null])
                    ->log('Petición de momento reenviada.');

                if ($oldPath !== null) {
                    DB::afterCommit(fn () => $this->deleteImage->execute($oldPath));
                }

                return $memory->refresh();
            });
        } catch (Throwable $e) {
            if ($newPath !== null) {
                $this->deleteImage->execute($newPath);
            }

            throw $e;
        }
    }

    /** Reglas de CA-27 según los campos marcados. */
    private function assertCorrection(VisitorMemory $memory, ?array $prepared, ?string $opinion): void
    {
        $errors = [];

        if ($memory->rejected_image) {
            if ($prepared === null) {
                $errors['image'] = 'Sube una foto nueva para reenviar tu petición.';
            } elseif ($memory->image_sha256 !== null && hash_equals($memory->image_sha256, $prepared['sha256'])) {
                $errors['image'] = 'Sube una foto distinta a la que fue rechazada.';
            }
        }

        if ($memory->rejected_content && ($opinion === null || $opinion === trim((string) $memory->opinion))) {
            $errors['opinion'] = 'Cambia la opinión antes de reenviarla.';
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
