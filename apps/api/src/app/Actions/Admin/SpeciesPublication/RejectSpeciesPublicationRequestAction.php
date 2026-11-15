<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\Admin\SpeciesPublication\Concerns\LocksSpeciesPublication;
use App\Actions\SpeciesPublication\Audit\LogSpeciesPublicationAction;
use App\Actions\SpeciesPublication\Media\DeleteManagedSpeciesImageAction;
use App\Enums\SpeciesRequestStatus;
use App\Models\SpeciesPublicationRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RejectSpeciesPublicationRequestAction
{
    use LocksSpeciesPublication;

    public function __construct(
        private readonly DeleteManagedSpeciesImageAction $deleteImage,
        private readonly LogSpeciesPublicationAction $audit,
    ) {}

    public function execute(User $admin, int $requestId, string $reason): SpeciesPublicationRequest
    {
        [$request, $pendingPath] = DB::transaction(function () use ($admin, $requestId, $reason) {
            [$species, $request] = $this->lockRequest($requestId);
            $this->assertSubmitted($request);

            $pendingPath = $request->image_path;

            $request->status = SpeciesRequestStatus::Rejected;
            $request->rejection_reason = $reason;
            $request->reviewed_by = $admin->id;
            $request->reviewed_at = now();
            $request->image_path = null;
            $request->save();

            $this->audit->execute(
                'species_publication.rejected',
                'Solicitud de publicación rechazada: '.$reason,
                $request,
                ['species_id' => $species->id, 'rejection_reason' => $reason],
            );

            return [$request, $pendingPath];
        });

        // The pending photo is removed only after the commit (CA-39).
        $this->deleteImage->execute($pendingPath);

        return $request;
    }
}
