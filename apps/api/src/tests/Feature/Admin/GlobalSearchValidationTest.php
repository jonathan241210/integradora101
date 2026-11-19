<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchValidationTest extends AdminFeatureTestCase
{
    use BuildsSearchFixtures;

    /** CA-21 enclosure-status-and-global-search */
    public function test_ca21_requires_session_and_returns_empty_groups_without_permission(): void
    {
        $this->assertTrue(Route::has('admin.search'));
        $this->getJson('/api/v1/admin/search?q=lobo')->assertUnauthorized();

        $executive = $this->createAccount('executive');
        $this->search($executive, 'lobo')->assertOk()->assertExactJson(['groups' => []]);
    }

    /** CA-22 enclosure-status-and-global-search */
    public function test_ca22_rejects_q_out_of_range_after_trim(): void
    {
        $admin = $this->searchAdmin();

        DB::flushQueryLog();
        DB::enableQueryLog();
        foreach (['', ' ', 'a', '  a  ', str_repeat('a', 101)] as $q) {
            $this->search($admin, $q)->assertUnprocessable()->assertJsonValidationErrors('q')
                ->assertJsonPath('errors.q.0', 'Escribe entre 2 y 100 caracteres para buscar.');
        }
        $this->actAs($admin)->getJson('/api/v1/admin/search')->assertUnprocessable()->assertJsonValidationErrors('q');
        $searched = collect(DB::getQueryLog())->filter(fn ($q) => str_contains($q['query'], ' like ') || str_contains($q['query'], 'visitor_memories'));
        DB::disableQueryLog();
        $this->assertCount(0, $searched);

        $this->search($admin, '  ab  ')->assertOk();
        $this->search($admin, str_repeat('a', 100))->assertOk();
    }
}
