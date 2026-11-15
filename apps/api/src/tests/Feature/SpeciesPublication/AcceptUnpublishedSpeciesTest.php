<?php

namespace Tests\Feature\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;
use App\Enums\SpeciesRequestType;

class AcceptUnpublishedSpeciesTest extends SpeciesPublicationTestCase
{
    private function accept(int $requestId, array $payload = [])
    {
        return $this->postJson(self::ADMIN_REQUESTS.'/'.$requestId.'/accept', $payload);
    }

    /** CA-08 */
    public function test_ca08_accept_unpublished_without_publishing_keeps_unpublished(): void
    {
        $admin = $this->zooAdmin();
        $unpublishedAt = now()->subDays(2)->startOfSecond();
        $publishedAt = now()->subDays(9)->startOfSecond();
        $species = $this->makeUnpublishedSpecies(['habitat' => 'Viejo', 'unpublished_at' => $unpublishedAt, 'published_at' => $publishedAt]);
        $request = $this->makeRequest($species, $this->veterinarian(), SpeciesRequestStatus::Submitted, ['request_type' => SpeciesRequestType::Update, 'habitat' => 'Nuevo']);

        $this->actAs($admin);
        $this->accept($request->id, ['publish' => false])->assertOk()
            ->assertJsonPath('publication_status', 'unpublished')
            ->assertJsonPath('is_published', false);

        $fresh = $species->fresh();
        $this->assertFalse($fresh->is_published);
        $this->assertEquals($unpublishedAt, $fresh->unpublished_at);
        $this->assertEquals($publishedAt, $fresh->published_at);
        $this->assertSame('Nuevo', $fresh->habitat);
        $this->assertSame(SpeciesRequestStatus::Accepted, $request->fresh()->status);

        // Default on an unpublished species is to publish.
        $second = $this->makeUnpublishedSpecies();
        $other = $this->makeRequest($second, $this->veterinarian(), SpeciesRequestStatus::Submitted, ['request_type' => SpeciesRequestType::Update]);
        $this->accept($other->id)->assertOk()->assertJsonPath('is_published', true);
        $this->assertNull($second->fresh()->unpublished_at);
    }

    /** CA-08 */
    public function test_ca08_publish_param_rules(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $this->actAs($admin);

        foreach ([$this->makeSpecies(), $this->makePublishedSpecies()] as $species) {
            $request = $this->makeRequest($species, $vet);
            $this->accept($request->id, ['publish' => false])->assertStatus(422)
                ->assertJsonPath('message', 'Esta solicitud solo puede aceptarse publicándola.');
            $this->assertSame(SpeciesRequestStatus::Submitted, $request->fresh()->status);
        }

        $request = $this->makeRequest($this->makeUnpublishedSpecies(), $vet);
        foreach (['maybe', 'si', [], 5] as $bad) {
            $this->accept($request->id, ['publish' => $bad])->assertStatus(422)->assertJsonPath('message', 'Indica si se publica o no.');
        }

        $this->accept($request->id, ['publish' => true])->assertOk()->assertJsonPath('is_published', true);
    }

    /** CA-32 */
    public function test_ca32_unpublished_update_stays_hidden_until_publish_accept(): void
    {
        $admin = $this->zooAdmin();
        $species = $this->makeUnpublishedSpecies();
        $request = $this->makeRequest($species, $this->veterinarian(), SpeciesRequestStatus::Submitted, ['request_type' => SpeciesRequestType::Update]);

        $this->assertFalse($species->fresh()->is_published);

        $this->actAs($admin)->getJson(self::ADMIN_SPECIES.'/'.$species->id.'/publication')->assertOk()
            ->assertJsonPath('publication_status', 'pending')->assertJsonPath('is_published', false);
        $this->assertFalse($species->fresh()->is_published);

        $this->accept($request->id, ['publish' => true])->assertOk()->assertJsonPath('publication_status', 'published');
        $this->assertTrue($species->fresh()->is_published);
    }
}
