<?php

namespace App\Actions\Admin\Content;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\News;

class SetNewsStatusAction
{
    public function __construct(private LogAdminActivityAction $log) {}

    public function execute(News $news, bool $active): News
    {
        $news->is_active = $active;
        $news->save();

        $this->log->execute('status-changed', $active ? 'Noticia activada' : 'Noticia desactivada', $news, ['is_active' => $active]);

        return $news->fresh();
    }
}
