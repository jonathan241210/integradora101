<?php

namespace Tests\Feature\Staff;

use Tests\FeatureTestCase;

class ReadmeDatabaseCommandsTest extends FeatureTestCase
{
    /** CA-16 staff-authentication */
    public function test_ca16_staff_authentication_root_readme_documents_safe_database_commands(): void
    {
        $readme = file_get_contents(base_path('../../../README.md'));

        $this->assertStringContainsString('## Comandos de base de datos (API)', $readme);
        $this->assertStringContainsString('php artisan db:show`', $readme);
        $this->assertStringContainsString('php artisan db:show --counts', $readme);
        $this->assertStringContainsString('php artisan db:table <tabla>', $readme);
        $this->assertStringContainsString('php artisan migrate:status', $readme);
        $this->assertStringContainsString('php artisan arca:create-staff', $readme);
        $this->assertStringContainsString('arca_pruebas', $readme);
        $this->assertStringContainsString('arca_zoo', $readme);
        $this->assertStringContainsString('migrate:fresh', $readme);
    }
}
