<?php

namespace Tests\Concerns;

use Illuminate\Support\Facades\DB;
use RuntimeException;

trait InteractsWithArcaPruebas
{
    public function setUp(): void
    {
        $configuredDatabase = $_ENV['DB_DATABASE']
            ?? $_SERVER['DB_DATABASE']
            ?? getenv('DB_DATABASE');

        if ($configuredDatabase !== 'arca_pruebas') {
            throw new RuntimeException('Los tests de API requieren DB_DATABASE=arca_pruebas.');
        }

        parent::setUp();

        if (DB::getDatabaseName() !== 'arca_pruebas') {
            throw new RuntimeException('Los tests de API solo pueden ejecutarse en arca_pruebas.');
        }
    }
}
