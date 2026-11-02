<?php

namespace App\Actions\Admin\Content;

use App\Models\News;
use Illuminate\Database\Eloquent\Collection;

class ListNewsAction
{
    /**
     * @return Collection<int, News>
     */
    public function execute(): Collection
    {
        return News::query()
            ->orderByDesc('published_date')
            ->orderByDesc('id')
            ->get();
    }
}
