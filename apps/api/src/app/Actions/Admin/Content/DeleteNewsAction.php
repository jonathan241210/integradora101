<?php

namespace App\Actions\Admin\Content;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\News;
use Illuminate\Support\Facades\DB;

class DeleteNewsAction
{
    public function __construct(
        private LogAdminActivityAction $log,
        private DeleteContentImageAction $deleteImage,
    ) {}

    public function execute(News $news): void
    {
        $path = $news->image_path;

        DB::transaction(function () use ($news) {
            $news->image_path = null;
            $news->save();
            $news->delete();
        });

        $this->deleteImage->execute($path);

        $this->log->execute('deleted', 'Noticia eliminada', $news, ['title' => $news->title]);
    }
}
