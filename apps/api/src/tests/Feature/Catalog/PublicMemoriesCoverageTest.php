<?php

namespace Tests\Feature\Catalog;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\FeatureTestCase;

class PublicMemoriesCoverageTest extends FeatureTestCase
{
    /** CA-11 */
    public function test_ca11_suite_names_every_criterion_and_uses_database_transactions(): void
    {
        $this->assertSame('arca_pruebas', DB::connection()->getDatabaseName());
        $this->assertSame('arca_pruebas', config('database.connections.mysql.database'));

        $main = (string) file_get_contents(__DIR__.'/PublicMemoriesTest.php');

        foreach ([...range(1, 10), 12] as $n) {
            $this->assertMatchesRegularExpression(
                sprintf('/\/\*\* CA-%02d \*\/\s+public function test_ca%02d_/', $n, $n),
                $main,
                "Falta un test para CA-$n de public-memories-read."
            );
        }
        $this->assertMatchesRegularExpression('/\/\*\* CA-11 \*\/\s+public function test_ca11_/', (string) file_get_contents(__FILE__));

        $this->assertContains(DatabaseTransactions::class, class_uses_recursive($this));
        $this->assertContains(DatabaseTransactions::class, class_uses_recursive(PublicMemoriesTest::class));
        $this->assertNotContains(RefreshDatabase::class, class_uses_recursive($this));
        $this->assertStringContainsString('Carbon::setTestNow', $main);
        foreach (['migrate:fresh', 'artisan migrate', 'Artisan::call'] as $forbidden) {
            $this->assertStringNotContainsString("'".$forbidden, $main);
        }
        $this->assertStringNotContainsString('RefreshDatabase', $main);
    }
}
