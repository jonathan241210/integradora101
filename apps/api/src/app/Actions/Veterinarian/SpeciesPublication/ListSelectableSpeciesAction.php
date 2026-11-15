<?php

namespace App\Actions\Veterinarian\SpeciesPublication;

use App\Actions\SpeciesPublication\DeriveSpeciesPublicationStatusAction;
use App\Enums\PublicationStatus;
use App\Enums\SpeciesRequestStatus;
use App\Models\Species;
use App\Models\SpeciesPublicationRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class ListSelectableSpeciesAction
{
    public function __construct(private readonly DeriveSpeciesPublicationStatusAction $derive) {}

    /**
     * Non-deleted species with their derived publication state (RN-18, RN-22).
     * Each item carries `publication_status` and `last_rejection_reason` as runtime attributes.
     *
     * @return Collection<int, Species>
     */
    public function execute(User $user): Collection
    {
        $species = Species::query()->orderBy('common_name')->orderBy('id')->get();

        $pending = SpeciesPublicationRequest::query()
            ->where('status', SpeciesRequestStatus::Submitted->value)
            ->pluck('species_id')
            ->flip();

        // Latest own request per species (rejected reasons are shown only for the author).
        $latestOwn = SpeciesPublicationRequest::query()
            ->where('created_by', $user->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get(['id', 'species_id', 'status', 'rejection_reason'])
            ->unique('species_id')
            ->keyBy('species_id');

        foreach ($species as $item) {
            $status = $this->derive->execute($item, $pending->has($item->id));
            $latest = $latestOwn->get($item->id);

            $item->setAttribute('publication_status', $status);
            $item->setAttribute(
                'last_rejection_reason',
                $status === PublicationStatus::NotPublished && $latest?->status === SpeciesRequestStatus::Rejected
                    ? $latest->rejection_reason
                    : null,
            );
        }

        return $species;
    }
}
