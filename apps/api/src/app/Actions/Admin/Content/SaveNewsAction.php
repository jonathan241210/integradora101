<?php

namespace App\Actions\Admin\Content;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\News;
use App\Models\User;

class SaveNewsAction
{
    public function __construct(private LogAdminActivityAction $log) {}

    public function execute(User $actor, ?News $news, array $data): News
    {
        $creating = $news === null;
        $news ??= new News;

        $fields = array_intersect_key($data, array_flip([
            'title', 'description', 'content', 'published_date', 'start_date', 'end_date', 'category',
        ]));
        $news->fill($fields);

        if ($creating) {
            $news->is_active = $data['is_active'] ?? true;
            $news->author_id = $actor->id;
        }

        $news->save();
        $news = $news->fresh();

        $this->log->execute(
            $creating ? 'created' : 'updated',
            $creating ? 'Noticia creada' : 'Noticia actualizada',
            $news,
            ['title' => $news->title],
        );

        return $news;
    }
}
