<?php

namespace App\Actions\Catalog;

use App\Models\News;

class GetPublishedNewsAction
{
    public function execute(int $newsId): ?News
    {
        return News::query()->publicVisible()->find($newsId);
    }
}
