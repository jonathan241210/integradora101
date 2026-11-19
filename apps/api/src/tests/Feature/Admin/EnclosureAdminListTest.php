<?php

namespace Tests\Feature\Admin;

use Tests\Concerns\BuildsEnclosureFixtures;

class EnclosureAdminListTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;

    /** CA-10 enclosure-status-and-global-search */
    public function test_ca10_lists_active_and_inactive_not_deleted(): void
    {
        $admin = $this->createAccount('admin');
        $active = $this->makeEnclosure();
        $inactive = $this->makeEnclosure(['is_active' => 0]);
        $deleted = $this->makeEnclosure();
        $this->makeAnimal($active);
        $this->makeAnimal($active);
        $deleted->delete();

        $rows = collect($this->actAs($admin)->getJson('/api/v1/admin/enclosures')->assertOk()->json('data'))->keyBy('id');

        $this->assertTrue($rows[$active->id]['is_active']);
        $this->assertSame(2, $rows[$active->id]['animals_count']);
        $this->assertFalse($rows[$inactive->id]['is_active']);
        $this->assertSame(0, $rows[$inactive->id]['animals_count']);
        $this->assertFalse($rows->has($deleted->id));
    }
}
