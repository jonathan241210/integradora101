<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DbConnectionTest extends TestCase
{
    /**
     * CA-01: .env.example contiene las claves requeridas y DB_PASSWORD vacío.
     */
    public function test_ca01_env_example_contains_required_keys(): void
    {
        $envExamplePath = base_path('.env.example');
        $this->assertFileExists($envExamplePath);

        $content = file_get_contents($envExamplePath);
        $this->assertStringContainsString('DB_CONNECTION=mysql', $content);
        $this->assertStringContainsString('DB_HOST=mysql-230c9986-arcannb.a.aivencloud.com', $content);
        $this->assertStringContainsString('DB_PORT=15280', $content);
        $this->assertStringContainsString('DB_DATABASE=arca_pruebas', $content);
        $this->assertStringContainsString('DB_SSL_CA=', $content);
        $this->assertMatchesRegularExpression('/^DB_PASSWORD=\s*$/m', $content);
    }

    /**
     * CA-02: La conexión a MySQL responde exitosamente a través de PDO.
     */
    public function test_ca02_database_connection_succeeds(): void
    {
        $pdo = DB::connection()->getPdo();
        $this->assertNotNull($pdo);

        $version = DB::select('SELECT VERSION() as version')[0]->version ?? null;
        $this->assertNotNull($version);
        $this->assertNotEmpty($version);
    }

    /**
     * CA-03: El inventario documental existe y contiene la información relevante.
     */
    public function test_ca03_inventory_document_exists_and_contains_version(): void
    {
        $inventoryPath = base_path('../docs/inventario-bd-inicial.md');
        $this->assertFileExists($inventoryPath);

        $content = file_get_contents($inventoryPath);
        $this->assertStringContainsString('8.4.11', $content);
        $this->assertStringContainsString('utf8mb4', $content);
        $this->assertStringContainsString('arca_pruebas', $content);
        $this->assertStringContainsString('Presidencia', $content);
    }

    /**
     * CA-04: .env local no está versionado en Git.
     */
    public function test_ca04_env_file_is_gitignored(): void
    {
        $gitignorePath = base_path('.gitignore');
        $this->assertFileExists($gitignorePath);

        $content = file_get_contents($gitignorePath);
        $this->assertMatchesRegularExpression('/^\.env$/m', $content);
    }

    /**
     * CA-05: Laravel arranca correctamente en versión 12.
     */
    public function test_ca05_laravel_boots_successfully(): void
    {
        $this->assertTrue(app()->isBooted());
        $this->assertStringStartsWith('12.', app()->version());
    }
}
