<?php

namespace Tests\Feature\Admin;

use App\Actions\Admin\Content\DeleteContentImageAction;
use App\Actions\Admin\Content\ResolveContentImageUrlAction;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;

class ContentImageCoverageTest extends AdminFeatureTestCase
{
    /** CA-13 */
    public function test_ca13_event_news_images_suite_names_every_criterion_and_uses_the_test_database(): void
    {
        $files = collect(File::allFiles(__DIR__))
            ->filter(fn ($file) => in_array($file->getFilename(), ['NewsImagesTest.php', 'EventImagesTest.php'], true));
        $this->assertCount(2, $files);

        foreach ($files as $file) {
            $source = $file->getContents();

            for ($index = 1; $index <= 12; $index++) {
                $number = str_pad((string) $index, 2, '0', STR_PAD_LEFT);
                $this->assertStringContainsString("/** CA-{$number} */", $source, "Falta CA-{$number} en {$file->getFilename()}");
                $this->assertMatchesRegularExpression("/function test_ca{$number}_event_news_images_/", $source);
            }

            $this->assertStringContainsString("Storage::fake('public')", $source);
            $this->assertStringNotContainsString('Refresh'.'Database', $source);
        }

        foreach ([NewsImagesTest::class, EventImagesTest::class] as $class) {
            $this->assertContains(DatabaseTransactions::class, class_uses_recursive($class));
        }

        $this->assertSame('arca_pruebas', DB::connection()->getDatabaseName());
        $this->assertStringContainsString('arca_pruebas', file_get_contents(base_path('phpunit.xml')));
    }

    /** @return array<string, array{0: string, 1: bool}> */
    public static function paths(): array
    {
        $uuid = '0b0e8f3c-1a2b-4c3d-8e4f-5a6b7c8d9e0f';

        return [
            'valid news' => ["news/{$uuid}.jpg", true],
            'valid events webp' => ["events/{$uuid}.webp", true],
            'traversal' => ["news/../{$uuid}.jpg", false],
            'traversal prefix' => ["../news/{$uuid}.jpg", false],
            'external url' => ['https://example.test/x.jpg', false],
            'other folder' => ["other/{$uuid}.jpg", false],
            'trailing newline' => ["news/{$uuid}.jpg\n", false],
            'null' => ['', false],
        ];
    }

    /** RN-03 */
    #[DataProvider('paths')]
    public function test_rn03_resolve_and_delete_content_image_only_handle_managed_paths(string $path, bool $managed): void
    {
        Storage::fake('public');
        $path = $path === '' ? null : $path;
        $resolver = new ResolveContentImageUrlAction;

        $this->assertSame($managed, $resolver->isManaged($path));
        $managed ? $this->assertNotNull($resolver->execute($path)) : $this->assertNull($resolver->execute($path));

        if ($path !== null && ! str_contains($path, '..') && ! str_contains($path, "\n")) {
            Storage::disk('public')->put($path, 'x');
        }
        Storage::disk('public')->put('sentinel.txt', 'x');

        (new DeleteContentImageAction($resolver))->execute($path);

        if ($path !== null && ! str_contains($path, '..') && ! str_contains($path, "\n")) {
            $managed ? Storage::disk('public')->assertMissing($path) : Storage::disk('public')->assertExists($path);
        }
        Storage::disk('public')->assertExists('sentinel.txt');
    }

    /** RN-03 */
    public function test_rn03_delete_content_image_logs_a_warning_when_delete_returns_false_or_throws(): void
    {
        $path = 'news/'.Str::uuid().'.jpg';

        foreach ([false, new \RuntimeException('disk down')] as $outcome) {
            $disk = \Mockery::mock(FilesystemAdapter::class);
            $expectation = $disk->shouldReceive('delete')->once()->with($path);
            $outcome instanceof \Throwable ? $expectation->andThrow($outcome) : $expectation->andReturn($outcome);
            Storage::shouldReceive('disk')->with('public')->once()->andReturn($disk);
            Log::shouldReceive('warning')->once()->with('No se pudo borrar un archivo de imagen.', ['path' => $path]);

            (new DeleteContentImageAction(new ResolveContentImageUrlAction))->execute($path);
        }

        $this->assertTrue(true);
    }
}
