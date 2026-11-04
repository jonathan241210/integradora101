<?php

namespace App\Actions\Admin\Content;

use App\Models\Event;
use Illuminate\Database\Eloquent\Collection;

class ListEventsAdminAction
{
    /**
     * @return Collection<int, Event>
     */
    public function execute(): Collection
    {
        return Event::query()
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get();
    }
}
