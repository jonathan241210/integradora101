<?php

namespace Tests\Feature\Catalog;

use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\FeatureTestCase;

class EnclosureVisibilityTest extends FeatureTestCase
{
    use BuildsEnclosureFixtures;

    /** CA-12 enclosure-status-and-global-search */
    public function test_ca12_public_list_only_active(): void
    {
        $active = $this->makeEnclosure();
        $inactive = $this->makeEnclosure(['is_active' => 0]);
        $deleted = $this->makeEnclosure();
        $deleted->delete();

        $ids = collect($this->getJson('/api/v1/enclosures')->assertOk()->json('data'))->pluck('id');

        $this->assertTrue($ids->contains($active->id));
        $this->assertFalse($ids->contains($inactive->id));
        $this->assertFalse($ids->contains($deleted->id));
        $this->assertSame($ids->sort()->values()->all(), $ids->values()->all());
    }

    /** CA-13 enclosure-status-and-global-search */
    public function test_ca13_public_detail_404_for_inactive_or_deleted(): void
    {
        $inactive = $this->makeEnclosure(['is_active' => 0]);
        $deleted = $this->makeEnclosure();
        $deleted->delete();

        $unknown = $this->getJson('/api/v1/enclosures/999999999')->assertNotFound()->json();
        $this->assertSame(['message' => 'Recinto no encontrado.'], $unknown);
        foreach ([$inactive, $deleted] as $enclosure) {
            $this->getJson("/api/v1/enclosures/{$enclosure->id}")->assertNotFound()->assertExactJson($unknown);
        }
    }

    /** CA-14 enclosure-status-and-global-search */
    public function test_ca14_reactivated_enclosure_reappears(): void
    {
        $enclosure = $this->makeEnclosure(['is_active' => 0]);
        $this->getJson("/api/v1/enclosures/{$enclosure->id}")->assertNotFound();

        $enclosure->is_active = true;
        $enclosure->save();

        $this->getJson("/api/v1/enclosures/{$enclosure->id}")->assertOk()->assertJsonPath('data.id', $enclosure->id);
        $this->assertTrue(collect($this->getJson('/api/v1/enclosures')->json('data'))->pluck('id')->contains($enclosure->id));
    }
}
