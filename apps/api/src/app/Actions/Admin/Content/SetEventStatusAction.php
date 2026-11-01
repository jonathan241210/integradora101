<?php

namespace App\Actions\Admin\Content;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Event;

class SetEventStatusAction
{
    public function __construct(private LogAdminActivityAction $log) {}

    public function execute(Event $event, bool $active): Event
    {
        $event->is_active = $active;
        $event->save();

        $this->log->execute('status-changed', $active ? 'Evento activado' : 'Evento desactivado', $event, ['is_active' => $active]);

        return $event->fresh();
    }
}
