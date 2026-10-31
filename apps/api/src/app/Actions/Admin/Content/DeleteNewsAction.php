<?php

namespace App\Actions\Admin\Content;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\News;

class DeleteNewsAction
{
    public function __construct(private LogAdminActivityAction $log) {}

    public function execute(News $news): void
    {
        $news->delete();

        $this->log->execute('deleted', 'Noticia eliminada', $news, ['title' => $news->title]);
    }
}
