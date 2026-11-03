<?php

namespace App\Actions\Admin\Content;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Event;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

class SaveEventAction
{
    public function __construct(
        private LogAdminActivityAction $log,
        private StoreContentImageAction $store,
        private DeleteContentImageAction $deleteImage,
        private ResolveContentImageChangeAction $change,
    ) {}

    public function execute(User $actor, ?Event $event, array $data, ?UploadedFile $image = null, bool $removeImage = false): Event
    {
        $creating = $event === null;
        $event ??= new Event;
        $previous = $event->image_path;

        $newPath = $image !== null ? $this->store->execute($image, 'events') : null;
        [$finalPath, $imageAction] = $this->change->execute($previous, $newPath, $removeImage);

        $fields = array_intersect_key($data, array_flip([
            'name', 'description', 'start_date', 'end_date', 'start_time', 'end_time', 'location',
        ]));

        try {
            $event = DB::transaction(function () use ($event, $fields, $creating, $data, $actor, $finalPath) {
                $event->fill($fields);

                if ($creating) {
                    $event->is_active = $data['is_active'] ?? true;
                    $event->author_id = $actor->id;
                }

                $event->image_path = $finalPath;
                $event->save();

                return $event->fresh();
            });
        } catch (Throwable $e) {
            $this->deleteImage->execute($newPath);

            throw $e;
        }

        if ($imageAction !== null) {
            $this->deleteImage->execute($previous);
        }

        $this->log->execute(
            $creating ? 'created' : 'updated',
            $creating ? 'Evento creado' : 'Evento actualizado',
            $event,
            ['name' => $event->name],
        );

        if ($imageAction !== null) {
            $this->log->execute('image-changed', 'Imagen de evento modificada', $event, [
                'image_changed' => true,
                'action' => $imageAction,
            ]);
        }

        return $event;
    }
}
