<?php

namespace Tests\Feature\Media;

use Tests\TestCase;

/**
 * api-013: team flow and variables documented in infra/README.md (CA-20, CA-24).
 */
class MediaDocsTest extends TestCase
{
    private function block(): string
    {
        $readme = (string) file_get_contents(base_path('../../../infra/README.md'));
        $start = strpos($readme, 'Medios de prueba compartidos');
        $this->assertNotFalse($start, 'Missing «Medios de prueba compartidos» block.');
        $end = strpos($readme, '**Roles y permisos**', $start);

        return substr($readme, $start, $end === false ? null : $end - $start);
    }

    /** CA-20 */
    public function test_ca20_infra_readme_has_shared_media_block(): void
    {
        $block = $this->block();

        foreach (['api-013', 'git add apps/api/src/media', 'commit', 'git pull', 'volver a subir', 'datos de prueba', 'historial de git', 'species-requests/', 'species/'] as $needle) {
            $this->assertStringContainsString($needle, $block, "Missing «{$needle}».");
        }
        $this->assertStringNotContainsString('Fase', $block);
    }

    /** CA-24 */
    public function test_ca24_infra_readme_lists_media_variables_and_storage_link(): void
    {
        $block = $this->block();

        foreach (['PUBLIC_MEDIA_DISK', 'PRIVATE_MEDIA_DISK', 'MEDIA_PUBLIC_URL', 'storage:link', 'public/media'] as $needle) {
            $this->assertStringContainsString($needle, $block, "Missing «{$needle}».");
        }
    }
}
