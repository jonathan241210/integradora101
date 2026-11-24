<?php

namespace Tests\Feature\Timezone;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\FeatureTestCase;

class TimezoneCoverageTest extends FeatureTestCase
{
    /** CA-13 single-business-timezone */
    public function test_ca13_every_ca_is_named_and_suite_uses_database_transactions(): void
    {
        $source = '';
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(dirname(__DIR__, 2))) as $file) {
            if ($file->isFile() && str_ends_with($file->getFilename(), 'Test.php')) {
                $source .= file_get_contents($file->getPathname())."\n";
            }
        }

        // CA-08 se verifica con api-022 (enmienda técnica 2026-11-20) pero su test cita este mismo slug.
        foreach (range(1, 16) as $n) {
            $this->assertMatchesRegularExpression(sprintf('/CA-%02d single-business-timezone/', $n), $source, "Falta test para CA-$n de api-025");
        }
        $this->assertStringNotContainsString('use Refresh'.'Database', $source);
        $this->assertContains(DatabaseTransactions::class, class_uses_recursive(FeatureTestCase::class));
        $this->assertSame('arca_pruebas', config('database.connections.'.config('database.default').'.database'));
    }
}
