<?php

namespace Tests\Feature\Media;

use Tests\TestCase;

/**
 * api-013: cobertura de criterios (CA-25, RN-08).
 */
class ObjectStorageCoverageTest extends TestCase
{
    /** CA-25 */
    public function test_ca25_names_every_automated_criterion_and_uses_arca_pruebas(): void
    {
        $files = glob(__DIR__.'/*.php');
        $this->assertNotEmpty($files);

        $source = '';
        foreach ($files as $file) {
            $source .= file_get_contents($file);
        }

        for ($i = 1; $i <= 24; $i++) {
            $this->assertMatchesRegularExpression(sprintf('/function test_ca%02d_/', $i), $source, sprintf('Falta una prueba para CA-%02d.', $i));
        }

        $this->assertSame('arca_pruebas', config('database.connections.mysql.database'));

        $forbidden = ['Refresh'.'Database', 'migrate'.':fresh', 'artisan(\'mig'.'rate'];
        foreach ($files as $file) {
            if (basename($file) === basename(__FILE__)) {
                continue;
            }
            $content = file_get_contents($file);
            foreach ($forbidden as $needle) {
                $this->assertStringNotContainsString($needle, $content, basename($file));
            }
            $this->assertDoesNotMatchRegularExpression('/artisan\(\s*[\'"]migrate/', $content, basename($file));
        }
    }
}
