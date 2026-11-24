<?php

namespace Database\Seeders\Concerns;

use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * api-028 CA-12: los seeders de datos de prueba o de carga controlada se detienen, sin escribir,
 * en producción o contra `arca_zoo`.
 */
trait RefusesProduction
{
    protected function activeDatabaseName(): string
    {
        return DB::getDatabaseName();
    }

    protected function refuseProduction(): void
    {
        $name = (new \ReflectionClass($this))->getShortName();

        if (app()->environment('production')) {
            throw new RuntimeException("{$name} no se puede ejecutar en producción.");
        }

        if ($this->activeDatabaseName() === 'arca_zoo') {
            throw new RuntimeException("{$name} no se puede ejecutar en arca_zoo.");
        }
    }
}
