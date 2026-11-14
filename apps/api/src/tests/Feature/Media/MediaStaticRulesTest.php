<?php

namespace Tests\Feature\Media;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Tests\TestCase;

/**
 * api-013: static rules on the domain code (CA-02, CA-04; RN-07, D-P5).
 */
class MediaStaticRulesTest extends TestCase
{
    private const DOMAIN = ['app/Actions', 'app/Http', 'app/Models'];

    private const FORBIDDEN = [
        'Aws', 'AWS', 'S3', 'Amazon', 'Cloudinary', 'Azure', 'GoogleCloud', 'Google\\Cloud', 'Backblaze',
        'Wasabi', 'DigitalOcean', 'Flysystem', 'temporaryUploadUrl', 'temporaryUrl', "'s3'", '"s3"',
    ];

    /** @return array<string, string> relative path => source */
    private function sources(array $folders): array
    {
        $files = [];
        foreach ($folders as $folder) {
            $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(base_path($folder), RecursiveDirectoryIterator::SKIP_DOTS));
            foreach ($iterator as $file) {
                if ($file->getExtension() === 'php') {
                    $files[str_replace(base_path().'/', '', $file->getPathname())] = (string) file_get_contents($file->getPathname());
                }
            }
        }

        return $files;
    }

    /** CA-02 */
    public function test_ca02_actions_http_and_models_never_name_disk_literals(): void
    {
        $sources = $this->sources(self::DOMAIN);
        $this->assertNotEmpty($sources);

        foreach ($sources as $path => $source) {
            $this->assertDoesNotMatchRegularExpression(
                '/Storage::(disk|fake)\(\s*[\'"](public|local|media|s3)[\'"]/',
                $source,
                "{$path} names a disk literal.",
            );
            $this->assertDoesNotMatchRegularExpression('/->disk\(\s*[\'"](public|local|media|s3)[\'"]/', $source, "{$path} names a disk literal.");
        }
    }

    /** CA-02: no constant or property holds a disk name either. */
    public function test_ca02_app_has_no_disk_name_constants(): void
    {
        foreach ($this->sources(['app']) as $path => $source) {
            $this->assertDoesNotMatchRegularExpression(
                '/const\s+\w*DISK\w*\s*=\s*[\'"][^\'"]*[\'"]/i',
                $source,
                "{$path} defines a disk name constant.",
            );
        }
    }

    /** CA-04 (includes RN-07: no direct-upload URLs) */
    public function test_ca04_domain_has_no_provider_names_or_sdk_calls(): void
    {
        foreach ($this->sources(self::DOMAIN) as $path => $source) {
            foreach (self::FORBIDDEN as $name) {
                $this->assertStringNotContainsString($name, $source, "{$path} contains {$name}.");
            }
        }

        foreach ($this->sources(['app']) as $path => $source) {
            $this->assertSame(0, preg_match('/\benv\(/', $source), "{$path} reads env() outside config/.");
        }
    }
}
