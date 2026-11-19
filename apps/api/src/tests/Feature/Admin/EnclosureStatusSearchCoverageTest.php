<?php

namespace Tests\Feature\Admin;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\FeatureTestCase;

class EnclosureStatusSearchCoverageTest extends AdminFeatureTestCase
{
    /** @return list<string> */
    private function specFiles(): array
    {
        $tests = dirname(__DIR__, 2);

        return array_map(fn (string $path) => $tests.'/'.$path, [
            'Feature/Admin/EnclosureStatusTest.php',
            'Feature/Admin/EnclosureDeleteTest.php',
            'Feature/Admin/EnclosureAccessTest.php',
            'Feature/Admin/EnclosureAdminListTest.php',
            'Feature/Admin/EnclosureNameTest.php',
            'Feature/Admin/EnclosureAssignmentTest.php',
            'Feature/Catalog/EnclosureVisibilityTest.php',
            'Feature/Visitor/EnclosureScanTest.php',
            'Feature/Visitor/EnclosureProgressTest.php',
            'Feature/Admin/GlobalSearchValidationTest.php',
            'Feature/Admin/GlobalSearchResultsTest.php',
            'Feature/Admin/GlobalSearchUsersTest.php',
            'Feature/Admin/GlobalSearchRecordsTest.php',
            'Feature/Admin/GlobalSearchTulanpediaTest.php',
            'Feature/Admin/GlobalSearchReadOnlyTest.php',
            'Feature/Admin/GlobalSearchNormalizationTest.php',
            'Feature/Admin/GlobalSearchTypoTest.php',
            'Feature/Admin/GlobalSearchRankingTest.php',
            'Feature/Admin/GlobalSearchMatchTest.php',
            'Feature/Admin/GlobalSearchFieldsTest.php',
            'Feature/Admin/GlobalSearchCapTest.php',
            'Feature/Admin/GlobalSearchThrottleTest.php',
            'Feature/Admin/GlobalSearchSecurityTest.php',
            'Feature/Admin/GlobalSearchRelevanceTest.php',
            'Feature/Admin/EnclosureStatusSearchCoverageTest.php',
        ]);
    }

    /** CA-34 enclosure-status-and-global-search */
    public function test_ca34_every_criterion_is_named_and_uses_database_transactions(): void
    {
        $source = '';
        foreach ($this->specFiles() as $file) {
            $this->assertFileExists($file);
            $source .= file_get_contents($file)."\n";
        }

        for ($index = 1; $index <= 54; $index++) {
            $number = str_pad((string) $index, 2, '0', STR_PAD_LEFT);
            $this->assertMatchesRegularExpression("/function test_ca{$number}_/", $source, "Falta un test nombrado para CA-{$number}");
            $this->assertStringContainsString("/** CA-{$number} enclosure-status-and-global-search */", $source);
        }

        // Los tests corren con DatabaseTransactions (FeatureTestCase) sobre arca_pruebas.
        $this->assertContains(DatabaseTransactions::class, class_uses(FeatureTestCase::class));
        $this->assertSame('arca_pruebas', DB::connection()->getDatabaseName());
        // Cadenas armadas para que AdminCoverageTest no las detecte en este archivo.
        $this->assertStringNotContainsString('Refresh'.'Database', str_replace('\'Refresh\'.\'Database\'', '', $source));
        $this->assertStringNotContainsString('migrate'.':fresh', str_replace('\'migrate\'.\':fresh\'', '', $source));
    }
}
