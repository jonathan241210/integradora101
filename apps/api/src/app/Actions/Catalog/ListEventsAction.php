<?php

namespace App\Actions\Catalog;

use App\Models\Event;
use App\Support\PublicCalendar;
use Illuminate\Database\Eloquent\Collection;

class ListEventsAction
{
    /**
     * @return Collection<int, Event>
     */
    public function execute(?int $limit = null): Collection
    {
        return Event::query()
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', PublicCalendar::today());
            })
            ->orderBy('start_date')
            ->orderBy('start_time')
            ->when($limit !== null, fn ($query) => $query->limit($limit))
            ->get();
    }
}
