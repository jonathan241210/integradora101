<?php

namespace App\Actions\Catalog;

use App\Models\Event;
use Illuminate\Database\Eloquent\Collection;

class ListEventsAction
{
    /**
     * @return Collection<int, Event>
     */
    public function execute(): Collection
    {
        return Event::query()
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', now()->toDateString());
            })
            ->orderBy('start_date')
            ->orderBy('start_time')
            ->get();
    }
}
