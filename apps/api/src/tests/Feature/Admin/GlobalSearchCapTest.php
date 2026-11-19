<?php

namespace Tests\Feature\Admin;

use App\Actions\Admin\Search\GlobalSearchAction;
use App\Actions\Admin\Search\Groups\SearchGroup;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchCapTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;
    use BuildsSearchFixtures;

    /** CA-46 enclosure-status-and-global-search */
    public function test_ca46_only_newest_candidates_are_compared(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $ids = [];
        foreach (range(1, 4) as $n) {
            $ids[] = $this->makeEnclosure(['name' => 'Tope '.$tag])->id;
        }

        $this->assertSame(2000, SearchGroup::CANDIDATE_LIMIT);
        $all = $this->groupsBySection($this->search($admin, $tag))['enclosures']['items'];
        $this->assertSame($ids, array_column($all, 'id'));

        // Con un tope de 3 solo se comparan los 3 registros más recientes por id.
        $this->app->bind(GlobalSearchAction::class, fn () => new GlobalSearchAction(3));
        $capped = $this->groupsBySection($this->search($admin, $tag))['enclosures']['items'];
        $this->assertSame(array_slice($ids, 1), array_column($capped, 'id'));
    }
}
