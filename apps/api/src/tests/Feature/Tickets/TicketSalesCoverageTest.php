<?php

namespace Tests\Feature\Tickets;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class TicketSalesCoverageTest extends TicketFeatureTestCase
{
    public function test_ca30_ticket_sales_suite_names_every_current_criterion_and_uses_the_test_database(): void
    {
        $files = collect(File::allFiles(__DIR__))
            ->reject(fn ($file) => $file->getFilename() === 'TicketSalesCoverageTest.php')
            ->push(new \SplFileInfo(dirname(__DIR__).'/Admin/ReportExcludesCancelledTicketsTest.php'));
        $source = $files->map(fn ($file) => file_get_contents($file->getPathname()))->implode("\n");

        // 32 CA vigentes: CA-01 a CA-22, CA-27 a CA-31, CA-34 y CA-42 a CA-45 (revisión 2026-11-02).
        $current = [...range(1, 22), ...range(27, 31), 34, ...range(42, 45)];
        $this->assertCount(32, $current);
        foreach ($current as $index) {
            if ($index === 30) {
                continue; // CA-30 es esta misma prueba.
            }
            $number = str_pad((string) $index, 2, '0', STR_PAD_LEFT);
            $this->assertMatchesRegularExpression(
                "/function test_ca{$number}_ticket_(sales|cancel|prices)_/",
                $source,
                "Falta un test nombrado para CA-{$number}",
            );
        }

        $this->assertSame('arca_pruebas', DB::connection()->getDatabaseName());
        $this->assertStringContainsString('arca_pruebas', file_get_contents(base_path('phpunit.xml')));
        $this->assertStringNotContainsString('RefreshDatabase', $source);
        $this->assertStringNotContainsString('migrate:fresh', $source);
    }
}
