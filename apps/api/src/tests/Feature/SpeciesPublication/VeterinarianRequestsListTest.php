<?php

namespace Tests\Feature\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;

class VeterinarianRequestsListTest extends SpeciesPublicationTestCase
{
    /** CA-33 */
    public function test_ca33_veterinarian_lists_only_own_requests(): void
    {
        $vet = $this->veterinarian();
        $other = $this->veterinarian();
        $reviewer = $this->createAccount('zoo-admin');

        $published = $this->makeUnpublishedSpecies(['common_name' => 'Despublicada propia']);
        $older = $this->makeRequest($published, $vet, SpeciesRequestStatus::Accepted, ['reviewed_by' => $reviewer->id, 'reviewed_at' => now()]);
        $notMine = $this->makeRequest($this->makeSpecies(), $other);
        $newer = $this->makeRequest($this->makeSpecies(['common_name' => 'Pendiente propia']), $vet);

        $response = $this->actAs($vet)->getJson(self::VET_REQUESTS)->assertOk();
        $rows = $response->json('data');

        $this->assertSame([$newer->id, $older->id], array_column($rows, 'id'));
        $this->assertNotContains($notMine->id, array_column($rows, 'id'));
        $this->assertFalse($response->json('meta.has_more'));

        $first = $rows[0];
        $this->assertSame(
            ['common_name', 'created_at', 'id', 'rejection_reason', 'request_type', 'reviewed_at', 'species_id', 'species_publication_status', 'status'],
            collect($first)->keys()->sort()->values()->all(),
        );
        $this->assertSame('pending', $first['species_publication_status']);
        $this->assertSame('unpublished', $rows[1]['species_publication_status']);
        $this->assertSame('Despublicada propia', $rows[1]['common_name']);
        $this->assertNotNull($rows[1]['reviewed_at']);
        $this->assertStringNotContainsString((string) $reviewer->email, $response->getContent());
    }

    /** CA-33 */
    public function test_ca33_rejection_reason_full_up_to_500_not_truncated(): void
    {
        $vet = $this->veterinarian();
        $reason = str_repeat('ñ', 500);
        $rejected = $this->makeRequest($this->makeSpecies(), $vet, SpeciesRequestStatus::Rejected, ['rejection_reason' => $reason]);
        $accepted = $this->makeRequest($this->makeSpecies(), $vet, SpeciesRequestStatus::Accepted, ['rejection_reason' => 'no debe verse']);

        $rows = collect($this->actAs($vet)->getJson(self::VET_REQUESTS)->assertOk()->json('data'))->keyBy('id');

        $this->assertSame($reason, $rows[$rejected->id]['rejection_reason']);
        $this->assertNull($rows[$accepted->id]['rejection_reason']);
    }

    /** CA-33 */
    public function test_ca33_hides_requests_of_deleted_publication(): void
    {
        $vet = $this->veterinarian();
        $visible = $this->makeRequest($this->makeSpecies(), $vet, SpeciesRequestStatus::Accepted);
        $hidden = $this->makeRequest($this->makeSpecies(), $vet, SpeciesRequestStatus::Accepted);
        $hidden->delete();

        $ids = array_column($this->actAs($vet)->getJson(self::VET_REQUESTS)->assertOk()->json('data'), 'id');

        $this->assertSame([$visible->id], $ids);

        // Pagination: 10 per page and has_more.
        $busy = $this->veterinarian();
        foreach (range(1, 11) as $unused) {
            $this->makeRequest($this->makeSpecies(), $busy, SpeciesRequestStatus::Accepted);
        }
        $page = $this->actAs($busy)->getJson(self::VET_REQUESTS)->assertOk();
        $this->assertCount(10, $page->json('data'));
        $this->assertTrue($page->json('meta.has_more'));
        $second = $this->actAs($busy)->getJson(self::VET_REQUESTS.'?page=2')->assertOk();
        $this->assertCount(1, $second->json('data'));
        $this->assertFalse($second->json('meta.has_more'));
    }
}
