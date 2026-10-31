<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class AdminCoverageTest extends AdminFeatureTestCase
{
    /** CA-27 */
    public function test_ca27_administration_management_suite_names_every_criterion_and_uses_the_test_database(): void
    {
        $files = collect(File::allFiles(__DIR__))
            ->reject(fn ($file) => $file->getFilename() === 'AdminCoverageTest.php');
        $source = $files->map(fn ($file) => $file->getContents())->implode("\n");

        for ($index = 1; $index <= 28; $index++) {
            if ($index === 27) {
                continue; // CA-27 es este mismo test.
            }

            $number = str_pad((string) $index, 2, '0', STR_PAD_LEFT);
            $this->assertStringContainsString("/** CA-{$number} */", $source, "Falta el comentario de CA-{$number}");
            $this->assertMatchesRegularExpression(
                "/function test_ca{$number}_administration_management_/",
                $source,
                "Falta un test nombrado para CA-{$number}",
            );
        }

        $this->assertSame('arca_pruebas', DB::connection()->getDatabaseName());
        $this->assertStringContainsString('arca_pruebas', file_get_contents(base_path('phpunit.xml')));
        $this->assertStringNotContainsString('RefreshDatabase', $source);
        $this->assertStringNotContainsString('migrate:fresh', $source);
    }
}
