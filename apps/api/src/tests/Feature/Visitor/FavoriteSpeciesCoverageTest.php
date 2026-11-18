<?php

namespace Tests\Feature\Visitor;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\FeatureTestCase;

class FavoriteSpeciesCoverageTest extends FeatureTestCase
{
    /** CA-09 */
    public function test_ca09_suite_names_every_criterion_and_uses_database_transactions(): void
    {
        $this->assertSame('arca_pruebas', DB::connection()->getDatabaseName());

        $source = file_get_contents(__DIR__.'/FavoriteSpeciesTest.php');
        foreach (range(1, 8) as $n) {
            $this->assertMatchesRegularExpression(
                sprintf('/function test_ca%02d_/', $n),
                $source,
                "Falta un test para CA-$n de visitor-favorite-species."
            );
        }

        $this->assertContains(DatabaseTransactions::class, class_uses_recursive(FavoriteSpeciesTest::class));
        $this->assertContains(DatabaseTransactions::class, class_uses_recursive($this));
        $this->assertNotContains(RefreshDatabase::class, class_uses_recursive($this));
        $this->assertNotContains(RefreshDatabase::class, class_uses_recursive(FavoriteSpeciesTest::class));

        foreach (['RefreshDatabase', 'migrate:fresh', 'artisan migrate', "call('migrate"] as $needle) {
            $this->assertStringNotContainsString($needle, $source);
        }
    }
}
