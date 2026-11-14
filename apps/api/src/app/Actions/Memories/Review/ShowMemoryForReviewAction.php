<?php

namespace App\Actions\Memories\Review;

use App\Actions\Admin\LogAdminActivityAction;
use App\Enums\MemoryStatus;
use App\Models\VisitorMemory;
use Illuminate\Support\Facades\DB;

class ShowMemoryForReviewAction
{
    public function __construct(private readonly LogAdminActivityAction $audit) {}

    /**
     * Abre el detalle. Si está `submitted` pasa a `in_review` con un UPDATE condicional
     * (RN-12): solo una apertura gana la transición y registra `in-review` (CA-08 a CA-10).
     */
    public function execute(string $id): VisitorMemory
    {
        abort_unless(ctype_digit($id), 404, 'Petición no encontrada.');

        return DB::transaction(function () use ($id) {
            $memory = VisitorMemory::query()->find((int) $id);
            abort_if($memory === null, 404, 'Petición no encontrada.');

            $moved = VisitorMemory::query()
                ->whereKey($memory->id)
                ->where('status', MemoryStatus::Submitted->value)
                ->update(['status' => MemoryStatus::InReview->value, 'updated_at' => now()]);

            if ($moved === 1) {
                $this->audit->execute('in-review', 'Petición de momento puesta en revisión.', $memory, ['memory_id' => $memory->id]);
            }

            return $memory->refresh();
        });
    }
}
