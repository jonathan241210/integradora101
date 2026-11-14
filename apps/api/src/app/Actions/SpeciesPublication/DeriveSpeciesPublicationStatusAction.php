<?php

namespace App\Actions\SpeciesPublication;

use App\Enums\PublicationStatus;
use App\Enums\SpeciesRequestStatus;
use App\Models\Species;
use App\Models\SpeciesPublicationRequest;

class DeriveSpeciesPublicationStatusAction
{
    /**
     * Priority: pending > published > unpublished > not_published (RN-18).
     * Pass $hasPendingRequest when it is already known to avoid a query.
     */
    public function execute(Species $species, ?bool $hasPendingRequest = null): PublicationStatus
    {
        $hasPendingRequest ??= SpeciesPublicationRequest::query()
            ->where('species_id', $species->id)
            ->where('status', SpeciesRequestStatus::Submitted->value)
            ->exists();

        if ($hasPendingRequest) {
            return PublicationStatus::Pending;
        }

        if ($species->is_published) {
            return PublicationStatus::Published;
        }

        if ($species->unpublished_at !== null) {
            return PublicationStatus::Unpublished;
        }

        return PublicationStatus::NotPublished;
    }
}
