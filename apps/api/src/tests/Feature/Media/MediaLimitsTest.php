<?php

namespace Tests\Feature\Media;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Tests\TestCase;

/**
 * api-013: cap of the shared folder (CA-22, automatable part; origin and consent are manual, T-29).
 */
class MediaLimitsTest extends TestCase
{
    private const MAX_IMAGES = 100;

    private const MAX_BYTES = 104857600;

    /** CA-22 */
    public function test_ca22_media_folder_within_100_images_or_100_mb(): void
    {
        $count = 0;
        $bytes = 0;
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(base_path('media'), RecursiveDirectoryIterator::SKIP_DOTS));

        foreach ($iterator as $file) {
            if (in_array(strtolower($file->getExtension()), ['jpg', 'jpeg', 'png', 'webp'], true)) {
                $count++;
                $bytes += $file->getSize();
            }
        }

        $this->assertLessThanOrEqual(self::MAX_IMAGES, $count, 'media/ exceeds 100 images.');
        $this->assertLessThanOrEqual(self::MAX_BYTES, $bytes, 'media/ exceeds 104857600 bytes.');
    }
}
