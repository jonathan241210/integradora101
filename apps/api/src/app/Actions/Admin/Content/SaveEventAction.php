<?php

namespace App\Actions\Admin\Content;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Event;
use App\Models\User;

class SaveEventAction
{
    public function __construct(private LogAdminActivityAction $log) {}

    public function execute(User $actor, ?Event $event, array $data): Event
    {
        $creating = $event === null;
        $event ??= new Event;

        $fields = array_intersect_key($data, array_flip([
            'name', 'description', 'start_date', 'end_date', 'start_time', 'end_time', 'location',
        ]));
        $event->fill($fields);

        if ($creating) {
            $event->is_active = $data['is_active'] ?? true;
            $event->author_id = $actor->id;
        }

        $event->save();
        $event = $event->fresh();

        $this->log->execute(
            $creating ? 'created' : 'updated',
            $creating ? 'Evento creado' : 'Evento actualizado',
            $event,
            ['name' => $event->name],
        );

        return $event;
    }
}
