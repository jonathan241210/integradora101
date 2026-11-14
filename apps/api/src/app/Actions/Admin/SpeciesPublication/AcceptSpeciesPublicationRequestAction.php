<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\Admin\SpeciesPublication\Concerns\LocksSpeciesPublication;
use App\Actions\SpeciesPublication\Audit\LogSpeciesPublicationAction;
use App\Actions\SpeciesPublication\DeriveSpeciesPublicationStatusAction;
use App\Actions\SpeciesPublication\Media\CopySpeciesImageAction;
use App\Actions\SpeciesPublication\Media\DeleteManagedSpeciesImageAction;
use App\Enums\PublicationStatus;
use App\Enums\SpeciesRequestStatus;
use App\Enums\SpeciesRequestType;
use App\Models\Species;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class AcceptSpeciesPublicationRequestAction
{
    use LocksSpeciesPublication;

    public function __construct(
        private readonly DeriveSpeciesPublicationStatusAction $derive,
        private readonly CopySpeciesImageAction $copyImage,
        private readonly DeleteManagedSpeciesImageAction $deleteImage,
        private readonly LogSpeciesPublicationAction $audit,
    ) {}

    /** Accepts a submitted request and returns the id of its species (CA-08). */
    public function execute(User $admin, int $requestId, ?bool $publish): int
    {
        $copied = null;

        try {
            [$speciesId, $originalPath, $previousPath] = DB::transaction(
                function () use ($admin, $requestId, $publish, &$copied) {
                    return $this->accept($admin, $requestId, $publish, $copied);
                },
            );
        } catch (Throwable $e) {
            $this->deleteImage->execute($copied);

            throw $e;
        }

        // Originals are removed only after the commit; a failure leaves a warning, never an error (CA-39).
        $this->deleteImage->execute($originalPath);
        $this->deleteImage->execute($previousPath);

        return $speciesId;
    }

    /** @return array{0: int, 1: ?string, 2: ?string} */
    private function accept(User $admin, int $requestId, ?bool $publish, ?string &$copied): array
    {
        [$species, $request] = $this->lockRequest($requestId);
        $this->assertSubmitted($request);

        $state = $this->derive->execute($species, false);
        $publishNow = $this->resolvePublish($state, $publish);

        foreach (['scientific_name', 'habitat'] as $field) {
            if ($request->{$field} !== null) {
                $species->{$field} = $request->{$field};
            }
        }
        if ($request->origin !== null) {
            $species->distribution = $request->origin;
        }
        if ($request->category !== null) {
            $species->category = $request->category;
        }
        if ($request->published_fields !== null) {
            $species->published_fields = $request->published_fields;
        }

        $originalPath = $request->image_path;
        $previousPath = null;

        if ($originalPath !== null) {
            $previousPath = $species->image_path;
            $copied = $this->copyImage->execute($originalPath);
            $species->image_path = $copied;
        }

        if ($publishNow) {
            $species->is_published = true;
            $species->unpublished_at = null;
            $species->published_at = now();
        }
        $species->save();

        $request->status = SpeciesRequestStatus::Accepted;
        $request->reviewed_by = $admin->id;
        $request->reviewed_at = now();
        $request->image_path = null;
        $request->save();

        $isUpdate = $request->request_type === SpeciesRequestType::Update;
        $creator = $request->creator?->full_name;
        $this->audit->execute(
            $isUpdate ? 'species_publication.update_accepted' : 'species_publication.published',
            ($isUpdate ? 'Actualización publicada por ' : 'Especie publicada por ').$admin->full_name
                .' a partir de la solicitud de '.$creator,
            $request,
            ['species_id' => $species->id, 'published' => $publishNow],
        );

        return [$species->id, $originalPath, $previousPath];
    }

    /** Rules of `publish` by species state (CA-08, RN-14). */
    private function resolvePublish(PublicationStatus $state, ?bool $publish): bool
    {
        if ($state === PublicationStatus::Unpublished) {
            return $publish ?? true;
        }

        if ($publish === false) {
            throw ValidationException::withMessages([
                'publish' => ['Esta solicitud solo puede aceptarse publicándola.'],
            ]);
        }

        return true;
    }
}
