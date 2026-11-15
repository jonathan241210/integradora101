<?php

namespace Tests\Feature\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;

class VeterinarianSelectorTest extends SpeciesPublicationTestCase
{
    /** CA-26 */
    public function test_ca26_veterinarian_lists_species_with_publication_status(): void
    {
        $vet = $this->veterinarian();
        $other = $this->veterinarian();

        $notPublished = $this->makeSpecies(['common_name' => 'Zzz libre', 'distribution' => 'Africa', 'habitat' => 'Sabana']);
        $pending = $this->makeSpecies(['common_name' => 'Zzz pendiente']);
        $this->makeRequest($pending, $other);
        $published = $this->makePublishedSpecies(['common_name' => 'Zzz publicada']);
        $unpublished = $this->makeUnpublishedSpecies(['common_name' => 'Zzz despublicada']);
        $deleted = $this->makeSpecies(['common_name' => 'Zzz borrada']);
        $deleted->delete();

        $response = $this->actAs($vet)->getJson(self::VET_SPECIES)->assertOk();
        $rows = collect($response->json('data'))->keyBy('id');

        $this->assertFalse($rows->has($deleted->id));
        $this->assertSame(['not_published', 'publish'], [$rows[$notPublished->id]['publication_status'], $rows[$notPublished->id]['next_request_type']]);
        $this->assertSame(['pending', null], [$rows[$pending->id]['publication_status'], $rows[$pending->id]['next_request_type']]);
        $this->assertSame(['published', 'update'], [$rows[$published->id]['publication_status'], $rows[$published->id]['next_request_type']]);
        $this->assertSame(['unpublished', 'update'], [$rows[$unpublished->id]['publication_status'], $rows[$unpublished->id]['next_request_type']]);
        $this->assertSame('Africa', $rows[$notPublished->id]['origin']);
        $this->assertSame('Sabana', $rows[$notPublished->id]['habitat']);
        $this->assertSame('mammal', $rows[$published->id]['category']);
        $this->assertNull($rows[$notPublished->id]['category']);
        $this->assertArrayNotHasKey('reviewed_by', $rows[$notPublished->id]);

        $names = array_column($response->json('data'), 'common_name');
        $sorted = $names;
        sort($sorted, SORT_STRING | SORT_FLAG_CASE);
        $this->assertSame(
            array_values(array_filter($names, fn ($n) => str_starts_with($n, 'Zzz'))),
            array_values(array_filter($sorted, fn ($n) => str_starts_with($n, 'Zzz'))),
        );
    }

    /** CA-26 */
    public function test_ca26_last_rejection_reason_full_text(): void
    {
        $vet = $this->veterinarian();
        $other = $this->veterinarian();
        $reason = str_repeat('m', 500);

        $own = $this->makeSpecies();
        $this->makeRequest($own, $vet, SpeciesRequestStatus::Rejected, ['rejection_reason' => $reason]);

        $foreign = $this->makeSpecies();
        $this->makeRequest($foreign, $other, SpeciesRequestStatus::Rejected, ['rejection_reason' => 'Motivo ajeno']);

        $accepted = $this->makeSpecies();
        $this->makeRequest($accepted, $vet, SpeciesRequestStatus::Rejected, ['rejection_reason' => 'Viejo']);
        $this->makeRequest($accepted, $vet, SpeciesRequestStatus::Accepted);

        $rows = collect($this->actAs($vet)->getJson(self::VET_SPECIES)->assertOk()->json('data'))->keyBy('id');

        $this->assertSame($reason, $rows[$own->id]['last_rejection_reason']);
        $this->assertNull($rows[$foreign->id]['last_rejection_reason']);
        $this->assertNull($rows[$accepted->id]['last_rejection_reason']);
    }
}
