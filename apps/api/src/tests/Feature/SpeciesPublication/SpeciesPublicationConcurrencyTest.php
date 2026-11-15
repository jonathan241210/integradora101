<?php

namespace Tests\Feature\SpeciesPublication;

class SpeciesPublicationConcurrencyTest extends SpeciesPublicationTestCase
{
    /** CA-19 */
    public function test_ca19_edit_and_decision_sequential_rules(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $this->actAs($admin);

        // Publish first, then edit: the request is reviewed, so the edit is rejected.
        $first = $this->makeRequest($this->makeSpecies(), $vet);
        $url = self::ADMIN_REQUESTS.'/'.$first->id;
        $this->postJson($url.'/accept')->assertOk();
        $this->patchJson($url, ['habitat' => 'Tarde'])->assertStatus(422)
            ->assertJsonPath('message', 'Esta solicitud ya fue revisada.');
        $this->assertNull($first->fresh()->habitat);

        // Edit first, then publish: the edited data is what gets published.
        $species = $this->makeSpecies();
        $second = $this->makeRequest($species, $vet);
        $url = self::ADMIN_REQUESTS.'/'.$second->id;
        $this->patchJson($url, ['habitat' => 'Sabana editada'])->assertOk();
        $this->postJson($url.'/accept')->assertOk();

        $species->refresh();
        $this->assertSame('Sabana editada', $species->habitat);
        $this->assertTrue($species->is_published);
    }

    /** CA-41 */
    public function test_ca41_publication_actions_recheck_state_inside_lock(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $this->actAs($admin);
        $base = self::ADMIN_SPECIES;

        // Unpublish then republish, each repeated call finds the new state.
        $species = $this->makePublishedSpecies();
        $this->postJson("$base/{$species->id}/unpublish")->assertOk();
        $this->postJson("$base/{$species->id}/unpublish")->assertStatus(422);
        $this->postJson("$base/{$species->id}/republish")->assertOk();
        $this->postJson("$base/{$species->id}/republish")->assertStatus(422);

        // Republish with a pending request is refused.
        $other = $this->makeUnpublishedSpecies();
        $this->makeRequest($other, $vet);
        $this->postJson("$base/{$other->id}/republish")->assertStatus(422);
        $this->assertFalse($other->fresh()->is_published);

        // Delete the publication, then accept/reject/edit the vanished request: 404.
        $request = $this->makeRequest($species, $vet);
        $this->deleteJson("$base/{$species->id}/publication")->assertOk();
        $this->postJson(self::ADMIN_REQUESTS.'/'.$request->id.'/accept')->assertNotFound()
            ->assertJsonPath('message', 'Solicitud no encontrada.');
        $this->postJson(self::ADMIN_REQUESTS.'/'.$request->id.'/reject', ['rejection_reason' => 'x'])->assertNotFound();
        $this->patchJson(self::ADMIN_REQUESTS.'/'.$request->id, ['habitat' => 'x'])->assertNotFound();
        $this->deleteJson("$base/{$species->id}/publication")->assertStatus(422);
    }
}
