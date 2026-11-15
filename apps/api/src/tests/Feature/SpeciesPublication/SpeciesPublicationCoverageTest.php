<?php

namespace Tests\Feature\SpeciesPublication;

use Tests\TestCase;

/** CA-13: every acceptance criterion CA-01 to CA-41 of api-014 has a named test. */
class SpeciesPublicationCoverageTest extends TestCase
{
    private const TOTAL_CA = 41;

    /** @return list<string> */
    private function specTestFiles(): array
    {
        $files = glob(__DIR__.'/*Test.php') ?: [];
        $files[] = dirname(__DIR__).'/Staff/SeedersTest.php';

        return $files;
    }

    public function test_ca13_every_ca_has_a_named_test(): void
    {
        $code = '';
        foreach ($this->specTestFiles() as $file) {
            $this->assertFileExists($file);
            $code .= file_get_contents($file)."\n";
        }

        preg_match_all('/function\s+test_ca(\d{2})_/', $code, $matches);
        $covered = array_unique(array_map('intval', $matches[1]));

        $missing = [];
        for ($n = 1; $n <= self::TOTAL_CA; $n++) {
            if (! in_array($n, $covered, true)) {
                $missing[] = sprintf('CA-%02d', $n);
            }
        }

        $this->assertSame([], $missing, 'CA without a named test: '.implode(', ', $missing));
    }

    public function test_ca13_tests_run_against_arca_pruebas(): void
    {
        $this->assertSame('arca_pruebas', config('database.connections.'.config('database.default').'.database'));
        $this->assertNotSame('arca_zoo', env('DB_DATABASE'));
    }

    public function test_ca13_spec_tests_do_not_use_refresh_database(): void
    {
        foreach ($this->specTestFiles() as $file) {
            $this->assertDoesNotMatchRegularExpression('/^\s*use\s+[\w\\\\]*RefreshDatabase\b/m', file_get_contents($file), basename($file));
        }
    }
}
