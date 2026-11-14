<?php

namespace Tests\Feature\Media;

use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

/**
 * api-013: smoke test against the test environment (CA-21). On demand only:
 * `php artisan test --group=smoke` with MEDIA_SMOKE_IMAGE_URL set in the local environment.
 */
#[Group('smoke')]
class MediaSmokeTest extends TestCase
{
    /** CA-21 */
    public function test_ca21_smoke_public_image_from_test_environment(): void
    {
        $url = getenv('MEDIA_SMOKE_IMAGE_URL');
        if (! is_string($url) || $url === '') {
            $this->markTestSkipped('Define MEDIA_SMOKE_IMAGE_URL (URL de una imagen publicada) para ejecutar el test de humo.');
        }

        $response = Http::timeout(10)->get($url);

        $this->assertSame(200, $response->status());
        $this->assertStringStartsWith('image/', (string) $response->header('Content-Type'));
    }
}
