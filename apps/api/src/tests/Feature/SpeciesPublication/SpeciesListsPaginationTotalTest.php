<?php

namespace Tests\Feature\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;

/** api-014 revision 2026-11-21: pagination with total in the three species lists. */
class SpeciesListsPaginationTotalTest extends SpeciesPublicationTestCase
{
    private const META_KEYS = ['current_page', 'has_more', 'last_page', 'per_page', 'total'];

    /** CA-42 */
    public function test_ca42_species_lists_return_meta_with_total_and_keep_has_more(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();

        $beforeRequests = $this->actAs($admin)->getJson(self::ADMIN_REQUESTS)->assertOk()->json('meta.total');
        $beforePublished = $this->actAs($admin)->getJson(self::ADMIN_PUBLISHED)->assertOk()->json('meta.total');

        foreach (range(1, 11) as $unused) {
            $species = $this->makePublishedSpecies();
            $this->makeRequest($species, $vet, SpeciesRequestStatus::Accepted);
        }

        $requests = $this->actAs($admin)->getJson(self::ADMIN_REQUESTS)->assertOk();
        $this->assertSame(self::META_KEYS, collect($requests->json('meta'))->keys()->sort()->values()->all());
        $this->assertSame($beforeRequests + 11, $requests->json('meta.total'));
        $this->assertSame((int) ceil(($beforeRequests + 11) / 10), $requests->json('meta.last_page'));
        $this->assertSame(10, $requests->json('meta.per_page'));
        $this->assertSame(1, $requests->json('meta.current_page'));
        $this->assertTrue($requests->json('meta.has_more'));

        $published = $this->actAs($admin)->getJson(self::ADMIN_PUBLISHED)->assertOk();
        $this->assertSame(self::META_KEYS, collect($published->json('meta'))->keys()->sort()->values()->all());
        $this->assertSame($beforePublished + 11, $published->json('meta.total'));
        $this->assertSame((int) ceil(($beforePublished + 11) / 10), $published->json('meta.last_page'));
        $this->assertSame(10, $published->json('meta.per_page'));

        $own = $this->actAs($vet)->getJson(self::VET_REQUESTS)->assertOk();
        $this->assertSame(self::META_KEYS, collect($own->json('meta'))->keys()->sort()->values()->all());
        $this->assertSame(11, $own->json('meta.total'));
        $this->assertSame(2, $own->json('meta.last_page'));
        $this->assertTrue($own->json('meta.has_more'));

        $last = $this->actAs($vet)->getJson(self::VET_REQUESTS.'?page=2')->assertOk();
        $this->assertSame(2, $last->json('meta.current_page'));
        $this->assertFalse($last->json('meta.has_more'));
        $this->assertCount(1, $last->json('data'));
    }

    /** CA-43 */
    public function test_ca43_species_lists_keep_stable_order_and_absurd_page_reports_total(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();

        // Same created_at: the id tie-break keeps the order stable and without duplicates across pages.
        $at = now()->addYears(5);
        foreach (range(1, 12) as $unused) {
            $this->makeRequest($this->makeSpecies(), $vet, SpeciesRequestStatus::Accepted, ['created_at' => $at]);
        }
        $first = $this->actAs($vet)->getJson(self::VET_REQUESTS)->assertOk();
        $second = $this->actAs($vet)->getJson(self::VET_REQUESTS.'?page=2')->assertOk();
        $ids = array_merge(array_column($first->json('data'), 'id'), array_column($second->json('data'), 'id'));
        $this->assertCount(12, array_unique($ids));
        $sorted = $ids;
        rsort($sorted);
        $this->assertSame($sorted, $ids);

        // Absurd page: empty data, real total, no 500.
        $huge = '9223372036854775807';
        $total = $first->json('meta.total');
        $own = $this->actAs($vet)->getJson(self::VET_REQUESTS.'?page='.$huge)->assertOk()->assertJsonPath('data', []);
        $this->assertSame($total, $own->json('meta.total'));
        $this->assertFalse($own->json('meta.has_more'));
        $this->assertSame(10, $own->json('meta.per_page'));

        $requests = $this->actAs($admin)->getJson(self::ADMIN_REQUESTS)->assertOk()->json('meta.total');
        $this->actAs($admin)->getJson(self::ADMIN_REQUESTS.'?page='.$huge)->assertOk()
            ->assertJsonPath('data', [])->assertJsonPath('meta.total', $requests)->assertJsonPath('meta.has_more', false);

        $published = $this->actAs($admin)->getJson(self::ADMIN_PUBLISHED)->assertOk()->json('meta.total');
        $this->actAs($admin)->getJson(self::ADMIN_PUBLISHED.'?page='.$huge)->assertOk()
            ->assertJsonPath('data', [])->assertJsonPath('meta.total', $published)->assertJsonPath('meta.has_more', false);
    }
}
