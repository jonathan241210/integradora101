<?php

namespace App\Actions\Memories\Review;

use App\Actions\Admin\LogAdminActivityAction;
use App\Actions\Media\ResolveMediaDiskAction;
use App\Enums\MemoryReviewDecision;
use App\Enums\MemoryStatus;
use App\Models\User;
use App\Models\VisitorMemory;
use App\Models\VisitorMemoryReview;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AcceptMemoryAction
{
    public function __construct(
        private readonly LogAdminActivityAction $audit,
        private readonly ComputePublicationWindowAction $window,
    ) {}

    public function execute(User $reviewer, string $id): VisitorMemory
    {
        abort_unless(ctype_digit($id), 404, 'Petición no encontrada.');

        return DB::transaction(function () use ($reviewer, $id) {
            $memory = VisitorMemory::query()->lockForUpdate()->find((int) $id);
            abort_if($memory === null, 404, 'Petición no encontrada.');

            $this->guardStatus($memory);

            $path = $memory->image_path;
            $disk = Storage::disk(app(ResolveMediaDiskAction::class)->privateDisk());
            if ($path === null || ! $disk->exists($path)) {
                throw ValidationException::withMessages([
                    'image' => 'La imagen no está disponible; no se puede aceptar.',
                ]);
            }

            $window = $this->window->execute();
            $now = now();

            // La imagen se queda donde está: published_image_path apunta al mismo archivo (api-013 CA-11).
            $memory->forceFill([
                'status' => MemoryStatus::Accepted->value,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => $now,
                'published_at' => $window['published_at'],
                'published_until' => $window['published_until'],
                'published_image_path' => $path,
            ])->save();

            VisitorMemoryReview::query()->create([
                'visitor_memory_id' => $memory->id,
                'decision' => MemoryReviewDecision::Accepted->value,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => $now,
            ]);

            $this->audit->execute('accepted', 'Petición de momento aceptada.', $memory, ['memory_id' => $memory->id]);

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
