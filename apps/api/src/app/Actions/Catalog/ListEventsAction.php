<?php

namespace App\Actions\Catalog;

use App\Models\Event;
use Illuminate\Database\Eloquent\Collection;

class ListEventsAction
{
    /**
     * @return Collection<int, Event>
     */
    public function execute(?int $limit = null): Collection
    {
        return Event::query()
            ->publicVisible()
            ->orderBy('start_date')
            ->orderBy('start_time')
            ->when($limit !== null, fn ($query) => $query->limit($limit))
            ->get();
    }
}
