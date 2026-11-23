<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/** CA-16 species-fun-fact: every criterion CA-01 to CA-15 of api-026 has a named test. */
class FunFactCoverageTest extends TestCase
{
    private const TOTAL_CA = 15;

    /** @return list<string> */
    private function sourceFiles(): array
    {
        $root = dirname(__DIR__);
        $files = array_merge(
            glob($root.'/Unit/*FunFact*Test.php') ?: [],
            glob($root.'/Unit/PublishedSpeciesFieldTest.php') ?: [],
            glob($root.'/Feature/*/*FunFact*Test.php') ?: [],
        );

        return $files;
    }

    /** CA-16 species-fun-fact */
    public function test_ca16_every_fun_fact_ca_is_named_in_a_test(): void
    {
        $code = '';
        foreach ($this->sourceFiles() as $file) {
            $code .= file_get_contents($file)."\n";
        }

        preg_match_all('#/\*\* CA-(\d{2}) species-fun-fact#', $code, $matches);
        $covered = array_unique(array_map('intval', $matches[1]));

        $missing = [];
        for ($n = 1; $n <= self::TOTAL_CA; $n++) {
            if (! in_array($n, $covered, true)) {
                $missing[] = sprintf('CA-%02d', $n);
            }
        }

        $this->assertSame([], $missing, 'api-026 CA without a named test: '.implode(', ', $missing));
    }
}
