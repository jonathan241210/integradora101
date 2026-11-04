<?php

namespace App\Actions\Admin\Content;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Event;

class DeleteEventAction
{
    public function __construct(private LogAdminActivityAction $log) {}

    public function execute(Event $event): void
    {
        $event->delete();

        $this->log->execute('deleted', 'Evento eliminado', $event, ['name' => $event->name]);
    }
}
