<?php

namespace App\Actions\Admin\Content;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Event;
use Illuminate\Support\Facades\DB;

class DeleteEventAction
{
    public function __construct(
        private LogAdminActivityAction $log,
        private DeleteContentImageAction $deleteImage,
    ) {}

    public function execute(Event $event): void
    {
        $path = $event->image_path;

        DB::transaction(function () use ($event) {
            $event->image_path = null;
            $event->save();
            $event->delete();
        });

        $this->deleteImage->execute($path);

        $this->log->execute('deleted', 'Evento eliminado', $event, ['name' => $event->name]);
    }
}
