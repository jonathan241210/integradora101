<?php

namespace App\Actions\Veterinarian\SpeciesPublication;

use App\Actions\SpeciesPublication\DeriveSpeciesPublicationStatusAction;
use App\Enums\SpeciesRequestStatus;
use App\Models\SpeciesPublicationRequest;
use App\Models\User;
use App\Support\PageGuard;
use Illuminate\Contracts\Pagination\Paginator;

class ListOwnSpeciesPublicationRequestsAction
{
    public const PER_PAGE = 10;

    public function __construct(private readonly DeriveSpeciesPublicationStatusAction $derive) {}

    /**
     * Own, non-deleted requests (CA-33). Each item carries `species_publication_status`.
     */
    public function execute(User $user): Paginator
    {
        if (PageGuard::exceeds()) {
            return PageGuard::empty(self::PER_PAGE);
        }

        $page = SpeciesPublicationRequest::query()
            ->where('created_by', $user->id)
            ->with(['species' => fn ($query) => $query->withTrashed()])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->simplePaginate(self::PER_PAGE);

        $speciesIds = $page->getCollection()->pluck('species_id')->unique()->all();
        $pending = SpeciesPublicationRequest::query()
            ->where('status', SpeciesRequestStatus::Submitted->value)
            ->whereIn('species_id', $speciesIds)
            ->pluck('species_id')
            ->flip();

        $page->getCollection()->each(function (SpeciesPublicationRequest $request) use ($pending): void {
            $request->setAttribute(
                'species_publication_status',
                $this->derive->execute($request->species, $pending->has($request->species_id)),
            );
        });

        return $page;
    }
}
