<?php

namespace Tests\Feature\Catalog;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\FeatureTestCase;

class PublishedSpeciesCoverageTest extends FeatureTestCase
{
    /** CA-12 */
    public function test_ca12_suite_names_every_criterion_and_uses_database_transactions(): void
    {
        $this->assertSame('arca_pruebas', DB::connection()->getDatabaseName());

        $source = file_get_contents(__DIR__.'/PublishedSpeciesTest.php');
        foreach (range(1, 18) as $n) {
            if ($n === 12) {
                continue; // This test.
            }
            $this->assertMatchesRegularExpression(
                sprintf('/function test_ca%02d_/', $n),
                $source,
                "Falta un test para CA-$n de public-species-read."
            );
        }

        $this->assertContains(DatabaseTransactions::class, class_uses_recursive(PublishedSpeciesTest::class));
        $this->assertContains(DatabaseTransactions::class, class_uses_recursive($this));
        $this->assertNotContains(RefreshDatabase::class, class_uses_recursive($this));

        foreach (['RefreshDatabase', 'migrate:fresh', 'artisan migrate', "call('migrate"] as $needle) {
            $this->assertStringNotContainsString($needle, $source);
        }
    }
}
