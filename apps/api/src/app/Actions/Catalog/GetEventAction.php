<?php

namespace App\Actions\Catalog;

use App\Models\Event;
use App\Support\PublicCalendar;

class GetEventAction
{
    public function execute(int $eventId): ?Event
    {
        return Event::query()
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', PublicCalendar::today());
            })
            ->find($eventId);
    }
}
