<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchReadOnlyTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;
    use BuildsSearchFixtures;

    /** CA-33 enclosure-status-and-global-search */
    public function test_ca33_search_writes_nothing_and_logs_nothing(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $this->makeNews('Noticia '.$tag);
        $this->makeEnclosure(['name' => 'Recinto '.$tag]);
        $ticket = $this->makeTicket();
        $tables = ['activity_log', 'users', 'news', 'events', 'enclosures', 'visitor_memories', 'species', 'species_publication_requests', 'tickets'];
        $count = fn () => array_map(fn ($table) => DB::table($table)->count(), $tables);
        $before = $count();

        $writes = [];
        DB::listen(function ($query) use (&$writes): void {
            if (! str_starts_with(strtolower(ltrim($query->sql)), 'select')) {
                $writes[] = $query->sql;
            }
        });
        $this->search($admin, $tag)->assertOk();
        $this->search($admin, (string) $ticket)->assertOk();

        $this->assertSame([], $writes);
        $this->assertSame($before, $count());
    }
}
