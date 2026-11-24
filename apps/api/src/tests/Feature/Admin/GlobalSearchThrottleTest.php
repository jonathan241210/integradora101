<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchThrottleTest extends AdminFeatureTestCase
{
    use BuildsSearchFixtures;

    /** CA-47 enclosure-status-and-global-search */
    public function test_ca47_thirty_per_minute_then_429(): void
    {
        // Sin permisos de grupo: cada petición cuesta solo la autenticación.
        $user = $this->createAccount('executive');
        $other = $this->createAccount('executive');

        foreach (range(1, 30) as $attempt) {
            $this->search($user, 'lobo')->assertOk();
        }

        $queries = [];
        DB::listen(function ($query) use (&$queries): void {
            $queries[] = strtolower($query->sql);
        });
        $this->search($user, 'lobo')
            ->assertStatus(429)
            ->assertJsonPath('message', 'Demasiadas búsquedas. Espera un minuto e inténtalo de nuevo.')
            ->assertHeader('Retry-After');
        foreach ($queries as $sql) {
            foreach (['`news`', '`events`', '`enclosures`', '`tickets`', '`species`', '`visitor_memories`'] as $table) {
                $this->assertStringNotContainsString($table, $sql);
            }
        }

        // El límite es por usuario.
        $this->search($other, 'lobo')->assertOk();
    }
}
