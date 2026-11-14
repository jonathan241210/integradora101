<?php

namespace App\Actions\SpeciesPublication\Media;

use App\Actions\Media\ResolveMediaDiskAction;
use App\Support\SpeciesMedia;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class DeleteManagedSpeciesImageAction
{
    public function __construct(private readonly ResolveMediaDiskAction $disks) {}

    /**
     * Deletes only managed paths (species/ and species-requests/ with a UUID name).
     * Never throws: failures leave a technical warning without the path (CA-39).
     */
    public function execute(?string $path): bool
    {
        if ($path === null || $path === '') {
            return false;
        }

        if (preg_match(SpeciesMedia::MANAGED_PATH_PATTERN, $path) !== 1) {
            Log::warning('Species photo deletion ignored: path outside the managed folders.');

            return false;
        }

        try {
            $disk = Storage::disk(str_starts_with($path, SpeciesMedia::PENDING_FOLDER.'/') ? $this->disks->privateDisk() : $this->disks->publicDisk());

            if (! $disk->exists($path)) {
                Log::warning('Species photo deletion skipped: the file no longer exists.');

                return false;
            }

            if (! $disk->delete($path)) {
                Log::warning('Species photo deletion failed.');

                return false;
            }

            return true;
        } catch (Throwable $e) {
            Log::warning('Species photo deletion failed: '.$e::class);

            return false;
        }
    }
}
