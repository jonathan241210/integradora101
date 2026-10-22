<?php

namespace Tests\Feature\Visitor;

use Illuminate\Support\Facades\File;

class CoverageTest extends VisitorFeatureTestCase
{
    /** CA-21 */
    public function test_ca21_suite_names_every_visitor_criterion(): void
    {
        $files = collect(File::allFiles(__DIR__));
        $source = $files->map(fn ($file) => $file->getContents())->implode("\n");
        $implementations = $files
            ->reject(fn ($file) => $file->getFilename() === 'CoverageTest.php')
            ->map(fn ($file) => $file->getContents())
            ->implode("\n");

        for ($index = 1; $index <= 21; $index++) {
            $code = 'CA-'.str_pad((string) $index, 2, '0', STR_PAD_LEFT);
            $this->assertStringContainsString($code, $source);
        }

        $this->assertStringContainsString('arca_pruebas', file_get_contents(base_path('phpunit.xml')));
        $this->assertStringNotContainsString('RefreshDatabase', $implementations);
        $this->assertStringNotContainsString('migrate:fresh', $implementations);
    }
}
