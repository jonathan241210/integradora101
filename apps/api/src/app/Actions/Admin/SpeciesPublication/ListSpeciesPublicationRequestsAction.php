<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\SpeciesPublication\DeriveSpeciesPublicationStatusAction;
use App\Enums\SpeciesRequestStatus;
use App\Models\SpeciesPublicationRequest;
use App\Support\PageGuard;
use Illuminate\Contracts\Pagination\Paginator;

class ListSpeciesPublicationRequestsAction
{
    public const PER_PAGE = 10;

    public function __construct(private readonly DeriveSpeciesPublicationStatusAction $derive) {}

    /**
     * Non-deleted requests, newest first (CA-05). Each item carries `publication_status` of its species.
     */
    public function execute(?string $status): Paginator
    {
        if (PageGuard::exceeds()) {
            return PageGuard::empty(self::PER_PAGE);
        }

        $page = SpeciesPublicationRequest::query()
            ->with(['species', 'creator'])
            ->whereHas('species')
            // Rows with a status outside the enum (legacy fixtures) are not part of this flow.
            ->whereIn('status', array_map(fn (SpeciesRequestStatus $s) => $s->value, SpeciesRequestStatus::cases()))
            ->when($status !== null && $status !== '', fn ($query) => $query->where('status', $status))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->simplePaginate(self::PER_PAGE);

        // The request itself is not counted: a pending request must not mask the species state (G-1 to G-3).
        $page->getCollection()->each(function (SpeciesPublicationRequest $request): void {
            $request->setAttribute('publication_status', $this->derive->execute($request->species, false));
        });

        return $page;
    }
}
