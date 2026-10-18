<?php

namespace Tests\Feature\Staff;

use Illuminate\Support\Facades\DB;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Tests\FeatureTestCase;

class TestDatabaseTest extends FeatureTestCase
{
    /** CA-17 staff-authentication */
    public function test_ca17_staff_authentication_suite_uses_arca_pruebas_and_names_every_acceptance_criterion(): void
    {
        $this->assertSame('arca_pruebas', DB::getDatabaseName());

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(base_path('tests'), RecursiveDirectoryIterator::SKIP_DOTS),
        );
        $testContent = '';

        foreach ($iterator as $file) {
            if ($file->isFile() && str_ends_with($file->getFilename(), '.php')) {
                $testContent .= file_get_contents($file->getPathname());
            }
        }

        for ($criterion = 1; $criterion <= 18; $criterion++) {
            $this->assertStringContainsString(
                sprintf('CA-%02d staff-authentication', $criterion),
                $testContent,
            );
        }
    }
}
