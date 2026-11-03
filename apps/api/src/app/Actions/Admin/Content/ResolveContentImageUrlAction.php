<?php

namespace App\Actions\Admin\Content;

use Illuminate\Support\Facades\Storage;

class ResolveContentImageUrlAction
{
    private const MANAGED = '#^(news|events)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$#D';

    public function isManaged(?string $path): bool
    {
        return $path !== null && preg_match(self::MANAGED, $path) === 1;
    }

    public function execute(?string $path): ?string
    {
        return $this->isManaged($path) ? Storage::disk('public')->url($path) : null;
    }
}
