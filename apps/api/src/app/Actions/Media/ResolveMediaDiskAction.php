<?php

namespace App\Actions\Media;

/**
 * Single point that resolves the disk name of each media scope (api-013, D-P3).
 * Reads only the media_scopes configuration; never the environment directly.
 */
class ResolveMediaDiskAction
{
    public const SCOPE_PUBLIC = 'public';

    public const SCOPE_PRIVATE = 'private';

    public function publicDisk(): string
    {
        return $this->resolve(self::SCOPE_PUBLIC, 'public');
    }

    public function privateDisk(): string
    {
        return $this->resolve(self::SCOPE_PRIVATE, 'local');
    }

    public function forScope(string $scope): string
    {
        return $scope === self::SCOPE_PRIVATE ? $this->privateDisk() : $this->publicDisk();
    }

    private function resolve(string $scope, string $fallback): string
    {
        $name = config('filesystems.media_scopes.'.$scope);

        return is_string($name) && $name !== '' ? $name : $fallback;
    }
}
