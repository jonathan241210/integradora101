<?php

namespace Tests\Feature\Media;

use Tests\TestCase;

/**
 * api-013: no storage or provider packages (CA-19).
 */
class MediaComposerTest extends TestCase
{
    /** CA-19 */
    public function test_ca19_composer_has_no_storage_or_provider_packages(): void
    {
        $composer = json_decode((string) file_get_contents(base_path('composer.json')), true, flags: JSON_THROW_ON_ERROR);
        $packages = array_keys(array_merge($composer['require'] ?? [], $composer['require-dev'] ?? []));
        $this->assertNotEmpty($packages);

        foreach ($packages as $package) {
            foreach (['flysystem', 'aws', 's3', 'azure', 'cloudinary', 'google/cloud', 'medialibrary', 'backblaze', 'wasabi', 'digitalocean'] as $forbidden) {
                $this->assertStringNotContainsString($forbidden, strtolower($package), "{$package} is a storage or provider package.");
            }
        }
    }
}
