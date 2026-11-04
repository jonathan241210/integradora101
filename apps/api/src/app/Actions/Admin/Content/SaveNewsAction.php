<?php

namespace App\Actions\Admin\Content;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\News;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

class SaveNewsAction
{
    public function __construct(
        private LogAdminActivityAction $log,
        private StoreContentImageAction $store,
        private DeleteContentImageAction $deleteImage,
        private ResolveContentImageChangeAction $change,
    ) {}

    public function execute(User $actor, ?News $news, array $data, ?UploadedFile $image = null, bool $removeImage = false): News
    {
        $creating = $news === null;
        $news ??= new News;
        $previous = $news->image_path;

        $newPath = $image !== null ? $this->store->execute($image, 'news') : null;
        [$finalPath, $imageAction] = $this->change->execute($previous, $newPath, $removeImage);

        $fields = array_intersect_key($data, array_flip([
            'title', 'description', 'content', 'published_date', 'start_date', 'end_date', 'category',
        ]));

        try {
            $news = DB::transaction(function () use ($news, $fields, $creating, $data, $actor, $finalPath) {
                $news->fill($fields);

                if ($creating) {
                    $news->is_active = $data['is_active'] ?? true;
                    $news->author_id = $actor->id;
                }

                $news->image_path = $finalPath;
                $news->save();

                return $news->fresh();
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
            $creating ? 'Noticia creada' : 'Noticia actualizada',
            $news,
            ['title' => $news->title],
        );

        if ($imageAction !== null) {
            $this->log->execute('image-changed', 'Imagen de noticia modificada', $news, [
                'image_changed' => true,
                'action' => $imageAction,
            ]);
        }

        return $news;
    }
}
