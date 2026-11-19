<?php

namespace App\Actions\Admin\Enclosures;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Enclosure;

class SetEnclosureStatusAction
{
    public function __construct(private LogAdminActivityAction $log) {}

    public function execute(Enclosure $enclosure, bool $active): Enclosure
    {
        if ((bool) $enclosure->is_active !== $active) {
            $enclosure->is_active = $active;
            $enclosure->save();

            $this->log->execute('status-changed', $active ? 'Recinto activado' : 'Recinto desactivado', $enclosure, ['is_active' => $active]);
        }

        return Enclosure::query()->withCount('animals')->findOrFail($enclosure->id);
    }
}
