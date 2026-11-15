<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\Admin\SpeciesPublication\Concerns\LocksSpeciesPublication;
use App\Actions\SpeciesPublication\Audit\LogSpeciesPublicationAction;
use App\Actions\SpeciesPublication\DeriveSpeciesPublicationStatusAction;
use App\Actions\SpeciesPublication\Media\DeleteManagedSpeciesImageAction;
use App\Enums\PublicationStatus;
use App\Enums\SpeciesRequestStatus;
use App\Models\SpeciesPublicationRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeleteSpeciesPublicationAction
{
    use LocksSpeciesPublication;

    public const REASON = 'La publicación fue eliminada por la Dirección.';

    public function __construct(
        private readonly DeriveSpeciesPublicationStatusAction $derive,
        private readonly DeleteManagedSpeciesImageAction $deleteImage,
        private readonly LogSpeciesPublicationAction $audit,
    ) {}

    /** Removes the publication data and soft-deletes every request; the species row stays (CA-38). */
    public function execute(User $admin, int $speciesId): void
    {
        $paths = DB::transaction(function () use ($admin, $speciesId): array {
            $species = $this->lockSpecies($speciesId);

            if ($this->derive->execute($species, false) === PublicationStatus::NotPublished) {
                throw ValidationException::withMessages(['species' => ['Esta especie no tiene publicación que eliminar.']]);
            }

            $requests = SpeciesPublicationRequest::query()
                ->where('species_id', $species->id)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $paths = [$species->image_path];
            $rejected = [];

            // Submitted requests become rejected first so they free the unique index (CA-38, decision A).
            foreach ($requests as $request) {
                $paths[] = $request->image_path;

                if ($request->getRawOriginal('status') === SpeciesRequestStatus::Submitted->value) {
                    $request->status = SpeciesRequestStatus::Rejected;
                    $request->rejection_reason = self::REASON;
                    $request->reviewed_by = $admin->id;
                    $request->reviewed_at = now();
                    $rejected[] = $request->id;
                }

                $request->image_path = null;
                $request->save();
                $request->delete();
            }

            $species->is_published = false;
            $species->published_at = null;
            $species->unpublished_at = null;
            $species->image_path = null;
            $species->published_fields = null;
            $species->save();

            $this->audit->execute(
                'species_publication.deleted',
                'Publicación de especie eliminada por '.$admin->full_name,
                $species,
                ['request_ids' => $requests->pluck('id')->all(), 'rejected_request_ids' => $rejected],
            );

            return array_values(array_filter($paths));
        });

        // Files are removed only after the commit (CA-39).
        foreach ($paths as $path) {
            $this->deleteImage->execute($path);
        }
    }
}
