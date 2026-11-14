<?php

namespace App\Actions\SpeciesPublication\Media;

use App\Actions\Media\ResolveMediaDiskAction;
use App\Support\SpeciesMedia;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class CopySpeciesImageAction
{
    public function __construct(private readonly ResolveMediaDiskAction $disks) {}

    /**
     * Copies a pending photo to the public folder keeping the same file name.
     */
    public function execute(string $pendingPath): string
    {
        if (preg_match(SpeciesMedia::MANAGED_PATH_PATTERN, $pendingPath) !== 1
            || ! str_starts_with($pendingPath, SpeciesMedia::PENDING_FOLDER.'/')) {
            throw new RuntimeException('Invalid pending photo path.');
        }

        $target = SpeciesMedia::PUBLIC_FOLDER.'/'.basename($pendingPath);

        $source = $this->disks->privateDisk();
        $destination = $this->disks->publicDisk();

        if ($source === $destination) {
            $copied = Storage::disk($source)->copy($pendingPath, $target);
        } else {
            $stream = Storage::disk($source)->readStream($pendingPath);
            $copied = is_resource($stream) && Storage::disk($destination)->writeStream($target, $stream);

            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        if (! $copied) {
            throw new RuntimeException('The photo could not be copied.');
        }

        return $target;
    }
}
