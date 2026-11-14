<?php

namespace Tests\Feature\Memories;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\FeatureTestCase;
use Tests\TestCase;

/**
 * CA-22: cada CA-01 a CA-32 de api-010 tiene al menos un test que lo nombra (docblock `CA-NN` y método `caNN_`),
 * contra arca_pruebas, con DatabaseTransactions y sin RefreshDatabase ni migraciones desde los tests.
 */
class MemoriesCoverageTest extends TestCase
{
    /**
     * Nombres previstos en MemoriesPublicReadIntegrationTest (T-26, depende de api-012). Su ausencia solo se tolera
     * porque el CA ya tiene otro test: CA-17 (admin), CA-18 (modelo) y CA-31 (modelo, admin y visitante).
     */
    private const PUBLIC_PENDING = [
        'ca17_public_list_never_exposes_non_accepted_memories',
        'ca18_public_list_shows_image_and_opinion_only',
        'ca31_public_list_excludes_expired',
    ];

    /** @return array<string, string> ruta => contenido */
    private function sources(): array
    {
        $dir = dirname(__DIR__, 2);
        $files = array_merge(glob($dir.'/Feature/Memories/*.php') ?: [], [$dir.'/Feature/Staff/SeedersTest.php']);
        $sources = [];

        foreach ($files as $file) {
            if (basename($file) === basename(__FILE__)) {
                continue;
            }
            $sources[$file] = (string) file_get_contents($file);
        }

        return $sources;
    }

    /** CA-22 */
    public function test_ca22_every_criterion_has_a_named_test(): void
    {
        $sources = $this->sources();
        $this->assertArrayHasKey(dirname(__DIR__, 2).'/Feature/Staff/SeedersTest.php', $sources);
        $all = implode("\n", $sources);
        $missing = [];

        for ($n = 1; $n <= 32; $n++) {
            if ($n === 22) {
                continue; // CA-22 lo cubre esta misma clase (sus métodos test_ca22_*), excluida del escaneo.
            }

            $ca = sprintf('CA-%02d', $n);
            $method = sprintf('ca%02d_', $n);

            $hasDocblock = preg_match('#/\*\*[^/]*\b'.$ca.'\b#', $all) === 1;
            $hasMethod = preg_match('/function (test_)?'.$method.'\w+\s*\(/', $all) === 1;

            if (! $hasDocblock || ! $hasMethod) {
                $missing[] = $ca.($hasDocblock ? '' : ' (docblock)').($hasMethod ? '' : ' (método)');
            }
        }

        $this->assertSame([], $missing, 'CA sin test que los nombre: '.implode(', ', $missing));
    }

    /** CA-22: los nombres públicos pendientes solo se toleran si el CA está cubierto por otro test. */
    public function test_ca22_missing_public_names_are_tolerated_only_when_the_criterion_is_covered_elsewhere(): void
    {
        $all = implode("\n", $this->sources());

        foreach (self::PUBLIC_PENDING as $name) {
            $present = preg_match('/function (test_)?'.preg_quote($name, '/').'\s*\(/', $all) === 1;
            $ca = strtoupper(substr($name, 0, 4));
            $other = preg_match('/function (test_)?'.strtolower($ca).'_(?!public_)\w+\s*\(/', $all) === 1;

            $this->assertTrue($present || $other, "{$name} ausente y {$ca} sin otro test");
        }
    }

    /** CA-22 */
    public function test_ca22_suite_targets_arca_pruebas_with_transactions_and_no_migrations(): void
    {
        $this->assertSame('arca_pruebas', env('DB_DATABASE'));
        $this->assertSame('arca_pruebas', config('database.connections.'.config('database.default').'.database'));

        $this->assertContains(DatabaseTransactions::class, class_uses_recursive(FeatureTestCase::class));

        $forbidden = ['RefreshDatabase', 'migrate:fresh', 'Artisan::call(\'migrate', 'Artisan::call("migrate', 'LazilyRefreshDatabase', 'DatabaseMigrations'];

        foreach ($this->sources() as $file => $source) {
            $name = basename($file);

            foreach ($forbidden as $word) {
                $this->assertStringNotContainsString($word, $source, "{$name} no debe usar {$word}");
            }

            if ($name === 'MemoriesRoutesTest.php' || $name === 'SeedersTest.php') {
                continue; // Sin base de datos o fuera del alcance de api-010.
            }

            $this->assertTrue(
                str_contains($source, 'DatabaseTransactions') || preg_match('/extends (FeatureTestCase|VisitorFeatureTestCase)\b/', $source) === 1,
                "{$name} debe usar DatabaseTransactions (directo o por FeatureTestCase)"
            );
        }
    }
}
