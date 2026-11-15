<?php

namespace App\Actions\Memories\Review;

use App\Actions\Admin\LogAdminActivityAction;
use App\Actions\Memories\Media\DeleteMemoryImageAction;
use App\Enums\MemoryRejectedField;
use App\Enums\MemoryReviewDecision;
use App\Enums\MemoryStatus;
use App\Models\User;
use App\Models\VisitorMemory;
use App\Models\VisitorMemoryReview;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RejectMemoryAction
{
    public function __construct(
        private readonly LogAdminActivityAction $audit,
        private readonly DeleteMemoryImageAction $deleteImage,
    ) {}

    /**
     * @param  list<string>  $fields  valores de MemoryRejectedField, ya validados.
     *
     * Con `image` marcado, image_path queda en NULL, image_sha256 se conserva y el archivo
     * se borra después del commit (CA-29); si el borrado falla, la petición sigue rechazada.
     */
    public function execute(User $reviewer, string $id, string $reason, array $fields): VisitorMemory
    {
        abort_unless(ctype_digit($id), 404, 'Petición no encontrada.');

        $rejectImage = in_array(MemoryRejectedField::Image->value, $fields, true);
        $rejectContent = in_array(MemoryRejectedField::Content->value, $fields, true);

        return DB::transaction(function () use ($reviewer, $id, $reason, $fields, $rejectImage, $rejectContent) {
            $memory = VisitorMemory::query()->lockForUpdate()->find((int) $id);
            abort_if($memory === null, 404, 'Petición no encontrada.');

            $this->guardStatus($memory);

            $now = now();
            $memory->forceFill([
                'status' => MemoryStatus::Rejected->value,
                'rejection_reason' => $reason,
                'rejected_image' => $rejectImage,
                'rejected_content' => $rejectContent,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => $now,
            ]);

            $oldPath = $memory->image_path;
            if ($rejectImage) {
                $memory->image_path = null;
            }

            $memory->save();

            VisitorMemoryReview::query()->create([
                'visitor_memory_id' => $memory->id,
                'decision' => MemoryReviewDecision::Rejected->value,
                'rejection_reason' => $reason,
                'rejected_image' => $rejectImage,
                'rejected_content' => $rejectContent,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => $now,
            ]);

            $this->audit->execute('rejected', 'Petición de momento rechazada.', $memory, [
                'memory_id' => $memory->id,
                'rejected_fields' => array_values($fields),
            ]);

            if ($rejectImage && $oldPath !== null) {
                DB::afterCommit(fn () => $this->deleteImage->execute($oldPath));
            }

            return $memory;
        });
    }

    private function guardStatus(VisitorMemory $memory): void
    {
        $message = match ($memory->status) {
            MemoryStatus::Accepted->value => 'Esta petición ya fue revisada.',
            MemoryStatus::Rejected->value => 'Esta petición está rechazada y espera la corrección del visitante.',
            default => null,
        };

        if ($message !== null) {
            throw ValidationException::withMessages(['status' => $message]);
        }
    }
}
