<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;
use App\Models\Species;
use App\Models\SpeciesPublicationRequest;
use App\Support\PageGuard;
use Illuminate\Contracts\Pagination\Paginator;

class ListPublishedSpeciesAction
{
    public const PER_PAGE = 10;

    /**
     * Published and unpublished species, never `not_published` (CA-40, RN-22).
     * Items carry `has_pending_request` as a runtime attribute.
     */
    public function execute(?string $status, ?string $category): Paginator
    {
        if (PageGuard::exceeds()) {
            return PageGuard::empty(self::PER_PAGE);
        }

        $page = Species::query()
            ->when($status === 'published', fn ($query) => $query->where('is_published', true))
            ->when($status === 'unpublished', fn ($query) => $query->where('is_published', false)->whereNotNull('unpublished_at'))
            ->when($status === null || $status === '', fn ($query) => $query->where(
                fn ($inner) => $inner->where('is_published', true)->orWhereNotNull('unpublished_at'),
            ))
            ->when($category !== null && $category !== '', fn ($query) => $query->where('category', $category))
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->simplePaginate(self::PER_PAGE);

        $pending = SpeciesPublicationRequest::query()
            ->where('status', SpeciesRequestStatus::Submitted->value)
            ->whereIn('species_id', $page->getCollection()->pluck('id')->all())
            ->pluck('species_id')
            ->flip();

        $page->getCollection()->each(
            fn (Species $species) => $species->setAttribute('has_pending_request', $pending->has($species->id)),
        );

        return $page;
    }
}
