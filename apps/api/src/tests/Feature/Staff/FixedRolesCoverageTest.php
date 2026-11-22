<?php

namespace Tests\Feature\Staff;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\FeatureTestCase;

class FixedRolesCoverageTest extends FeatureTestCase
{
    /** CA-28 api-023 */
    public function test_ca28_every_ca_is_named_and_suite_uses_database_transactions(): void
    {
        $source = '';
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(dirname(__DIR__, 2))) as $file) {
            if ($file->isFile() && str_ends_with($file->getFilename(), 'Test.php')) {
                $source .= file_get_contents($file->getPathname())."\n";
            }
        }

        foreach (range(1, 55) as $n) {
            $this->assertMatchesRegularExpression(sprintf('/CA-%02d api-023/', $n), $source, "Falta test para CA-$n de api-023");
        }
        $this->assertStringNotContainsString('use Refresh'.'Database', $source);
        $this->assertContains(DatabaseTransactions::class, class_uses_recursive(FeatureTestCase::class));
        $this->assertSame('arca_pruebas', config('database.connections.'.config('database.default').'.database'));
    }
}
