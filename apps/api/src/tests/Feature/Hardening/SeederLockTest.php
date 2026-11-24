<?php

namespace Tests\Feature\Hardening;

use Database\Seeders\Dbr019InsertEnclosuresAndTestAnimalsSeeder;
use Database\Seeders\Dbr019MapCoordinatesSeeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\FeatureTestCase;

/** api-028 · candado de los seeders DBR-019 (CA-12). */
class SeederLockTest extends FeatureTestCase
{
    /** CA-12 pre-delivery-hardening */
    public function test_ca12_dbr019_seeders_refuse_production_without_writing(): void
    {
        $this->app['env'] = 'production';
        $before = $this->counts();

        foreach ([Dbr019MapCoordinatesSeeder::class, Dbr019InsertEnclosuresAndTestAnimalsSeeder::class] as $class) {
            try {
                (new $class)->run();
                $this->fail("{$class} debió negarse en producción.");
            } catch (RuntimeException $e) {
                $this->assertStringContainsString('producción', $e->getMessage());
            }
        }

        $this->assertSame($before, $this->counts());
    }

    /** CA-12 pre-delivery-hardening */
    public function test_ca12_dbr019_seeders_refuse_arca_zoo_without_writing(): void
    {
        $before = $this->counts();

        foreach ([Dbr019MapCoordinatesSeeder::class, Dbr019InsertEnclosuresAndTestAnimalsSeeder::class] as $class) {
            $seeder = new class extends Dbr019MapCoordinatesSeeder
            {
                protected function activeDatabaseName(): string
                {
                    return 'arca_zoo';
                }
            };
            $zoo = $class === Dbr019MapCoordinatesSeeder::class
                ? $seeder
                : new class extends Dbr019InsertEnclosuresAndTestAnimalsSeeder
                {
                    protected function activeDatabaseName(): string
                    {
                        return 'arca_zoo';
                    }
                };

            try {
                $zoo->run();
                $this->fail("{$class} debió negarse en arca_zoo.");
            } catch (RuntimeException $e) {
                $this->assertStringContainsString('arca_zoo', $e->getMessage());
            }
        }

        $this->assertSame($before, $this->counts());
    }

    /** @return array<string,int> */
    private function counts(): array
    {
        return [
            'enclosures' => DB::table('enclosures')->count(),
            'animals' => DB::table('animals')->count(),
        ];
    }
}
