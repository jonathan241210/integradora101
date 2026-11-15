<?php

namespace Tests\Feature\Media;

use Illuminate\Support\Facades\Storage;
use Tests\FeatureTestCase;

/**
 * api-013: media disk configuration (CA-01, CA-06, CA-17).
 */
class MediaConfigTest extends FeatureTestCase
{
    private const KEYS = ['PUBLIC_MEDIA_DISK', 'PRIVATE_MEDIA_DISK', 'MEDIA_PUBLIC_URL', 'APP_URL'];

    /** @var array<string, mixed> */
    private array $saved = [];

    protected function setUp(): void
    {
        parent::setUp();

        foreach (self::KEYS as $key) {
            $this->saved[$key] = [
                'env' => array_key_exists($key, $_ENV) ? $_ENV[$key] : null,
                'server' => array_key_exists($key, $_SERVER) ? $_SERVER[$key] : null,
                'putenv' => getenv($key),
            ];
        }
    }

    protected function tearDown(): void
    {
        foreach ($this->saved as $key => $old) {
            $this->setEnv($key, $old['putenv'] === false ? null : $old['putenv']);
            if ($old['env'] !== null) {
                $_ENV[$key] = $old['env'];
            }
            if ($old['server'] !== null) {
                $_SERVER[$key] = $old['server'];
            }
        }

        parent::tearDown();
    }

    /**
     * @param  array<string, string|null>  $env  null removes the variable, '' sets it empty
     * @return array<string, mixed>
     */
    private function loadConfig(array $env): array
    {
        foreach ($env as $key => $value) {
            $this->setEnv($key, $value);
        }

        return require base_path('config/filesystems.php');
    }

    private function setEnv(string $key, ?string $value): void
    {
        if ($value === null) {
            putenv($key);
            unset($_ENV[$key], $_SERVER[$key]);

            return;
        }

        putenv("{$key}={$value}");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }

    /**
     * CA-01: absent or empty variables resolve public and local; media sets both to media.
     */
    public function test_ca01_defaults_use_public_and_local_scopes_when_env_absent(): void
    {
        $absent = $this->loadConfig(['PUBLIC_MEDIA_DISK' => null, 'PRIVATE_MEDIA_DISK' => null]);
        $this->assertSame('public', $absent['media_scopes']['public']);
        $this->assertSame('local', $absent['media_scopes']['private']);

        $empty = $this->loadConfig(['PUBLIC_MEDIA_DISK' => '', 'PRIVATE_MEDIA_DISK' => '']);
        $this->assertSame('public', $empty['media_scopes']['public']);
        $this->assertSame('local', $empty['media_scopes']['private']);

        $shared = $this->loadConfig(['PUBLIC_MEDIA_DISK' => 'media', 'PRIVATE_MEDIA_DISK' => 'media']);
        $this->assertSame('media', $shared['media_scopes']['public']);
        $this->assertSame('media', $shared['media_scopes']['private']);
    }

    /**
     * CA-06: .env.example declares the media keys with sample values and no secrets.
     */
    public function test_ca06_env_example_declares_media_keys_without_secrets(): void
    {
        $content = file_get_contents(base_path('.env.example'));

        $this->assertMatchesRegularExpression('/^PUBLIC_MEDIA_DISK=(public)?\s*$/m', $content);
        $this->assertMatchesRegularExpression('/^PRIVATE_MEDIA_DISK=(local)?\s*$/m', $content);
        $this->assertMatchesRegularExpression('/^MEDIA_PUBLIC_URL=\s*$/m', $content);
        $this->assertDoesNotMatchRegularExpression('/Signature=|X-Amz|AWS_SECRET_ACCESS_KEY=\S|AWS_ACCESS_KEY_ID=\S/', $content);
    }

    /**
     * CA-17: default media URL is APP_URL + /media; links include public/media and public/storage.
     */
    public function test_ca17_default_media_url_and_links_include_public_media(): void
    {
        $config = $this->loadConfig([
            'APP_URL' => 'http://example.test',
            'MEDIA_PUBLIC_URL' => '',
        ]);

        $this->assertSame(base_path('media'), $config['disks']['media']['root']);
        $this->assertSame('local', $config['disks']['media']['driver']);
        $this->assertSame('http://example.test/media', $config['disks']['media']['url']);
        $this->assertSame('http://example.test/storage', $config['disks']['public']['url']);

        $this->assertSame(base_path('media'), $config['links'][public_path('media')]);
        $this->assertSame(storage_path('app/public'), $config['links'][public_path('storage')]);

        $override = $this->loadConfig([
            'APP_URL' => 'http://example.test',
            'MEDIA_PUBLIC_URL' => 'http://cdn.test/files',
        ]);
        $this->assertSame('http://cdn.test/files', $override['disks']['media']['url']);
        $this->assertSame('http://cdn.test/files', $override['disks']['public']['url']);

        // The resolved disk URL (no writes) starts with APP_URL + /media/ by default.
        config(['filesystems.disks.media.url' => 'http://example.test/media']);
        Storage::forgetDisk('media');
        $this->assertSame('http://example.test/media/news/x.jpg', Storage::disk('media')->url('news/x.jpg'));
        Storage::forgetDisk('media');
    }
}
