<?php

namespace Tests\Feature\Media;

use Symfony\Component\Process\Process;
use Tests\FeatureTestCase;

/**
 * api-013: versioning rules of the shared media folder (CA-15).
 */
class MediaGitignoreTest extends FeatureTestCase
{
    private function repoRoot(): string
    {
        $process = new Process(['git', 'rev-parse', '--show-toplevel'], base_path());
        $process->run();
        $this->assertTrue($process->isSuccessful(), 'git is required for CA-15.');

        return trim($process->getOutput());
    }

    private function isIgnored(string $root, string $relative): bool
    {
        $process = new Process(['git', 'check-ignore', '-q', '--no-index', '--', $relative], $root);
        $process->run();

        return match ($process->getExitCode()) {
            0 => true,
            1 => false,
            default => $this->fail('git check-ignore failed: '.$process->getErrorOutput()),
        };
    }

    /**
     * CA-15: only .gitkeep and lowercase images are versioned inside the managed folders.
     */
    public function test_ca15_media_gitignore_allows_only_images_and_gitkeep(): void
    {
        $root = $this->repoRoot();
        $media = trim(substr(base_path('media'), strlen($root)), '/');

        $folders = ['news', 'events', 'memories', 'species', 'species-requests'];

        foreach ($folders as $folder) {
            foreach (['x.jpg', 'x.jpeg', 'x.png', 'x.webp', '.gitkeep'] as $file) {
                $this->assertFalse($this->isIgnored($root, "{$media}/{$folder}/{$file}"), "{$folder}/{$file} must be versioned");
            }
            foreach (['.DS_Store', 'x.gif', 'x.txt', 'x.svg'] as $file) {
                $this->assertTrue($this->isIgnored($root, "{$media}/{$folder}/{$file}"), "{$folder}/{$file} must be ignored");
            }
            $this->assertFileExists(base_path("media/{$folder}/.gitkeep"));
        }

        $this->assertFalse($this->isIgnored($root, "{$media}/.gitignore"));
        $this->assertTrue($this->isIgnored($root, "{$media}/x.jpg"));
        $this->assertTrue($this->isIgnored($root, "{$media}/other/x.jpg"));

        // The public/media link is not versioned; storage/ lives outside media/.
        $this->assertTrue($this->isIgnored($root, substr($media, 0, -strlen('media')).'public/media'));
        $this->assertTrue($this->isIgnored($root, substr($media, 0, -strlen('media')).'storage/app/private/x.jpg'));
        $this->assertStringStartsNotWith(base_path('media'), storage_path());
    }
}
