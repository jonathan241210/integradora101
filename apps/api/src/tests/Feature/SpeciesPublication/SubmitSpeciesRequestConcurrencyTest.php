<?php

namespace Tests\Feature\SpeciesPublication;

use App\Actions\SpeciesPublication\DeriveSpeciesPublicationStatusAction;
use App\Enums\PublicationStatus;
use App\Enums\SpeciesRequestStatus;
use App\Models\Species;
use App\Models\SpeciesPublicationRequest;

class SubmitSpeciesRequestConcurrencyTest extends SpeciesPublicationTestCase
{
    /** CA-34 */
    public function test_ca34_only_one_live_request_per_species(): void
    {
        $vet = $this->veterinarian();
        $message = 'Ya hay una solicitud pendiente para esta especie.';

        $notPublished = $this->makeSpecies();
        $this->makeRequest($notPublished, $vet);
        $response = $this->submit($vet, $this->submission($notPublished))->assertStatus(422);
        $this->assertSame($message, $response->json('errors.species_id.0'));

        $published = $this->makePublishedSpecies();
        $this->makeRequest($published, $vet);
        $response = $this->submit($vet, array_diff_key($this->submission($published), ['image' => 1]))->assertStatus(422);
        $this->assertSame($message, $response->json('errors.species_id.0'));

        // accepted and rejected requests do not block a new submission.
        $free = $this->makeSpecies();
        $this->makeRequest($free, $vet, SpeciesRequestStatus::Rejected, ['rejection_reason' => 'No']);
        $this->makeRequest($free, $vet, SpeciesRequestStatus::Accepted);
        $this->submit($vet, $this->submission($free))->assertCreated();

        // Only the photo of the accepted submission remains; the rejected attempt left none.
        $this->assertCount(1, $this->storedFiles());
    }

    /** CA-34 */
    public function test_ca34_db_unique_violation_maps_to_422_and_removes_new_photo(): void
    {
        $vet = $this->veterinarian();
        $species = $this->makeSpecies();
        $this->makeRequest($species, $vet);
        $speciesCount = Species::withTrashed()->count();

        // Simulates the race: the application check does not see the live request.
        $this->app->instance(DeriveSpeciesPublicationStatusAction::class, new class extends DeriveSpeciesPublicationStatusAction
        {
            public function execute(Species $species, ?bool $hasPendingRequest = null): PublicationStatus
            {
                return PublicationStatus::NotPublished;
            }
        });

        $response = $this->submit($vet, $this->submission($species))->assertStatus(422);

        $this->assertSame('Ya hay una solicitud pendiente para esta especie.', $response->json('errors.species_id.0'));
        $this->assertSame(1, SpeciesPublicationRequest::query()->where('species_id', $species->id)->count());
        $this->assertSame($speciesCount, Species::withTrashed()->count());
        $this->assertSame([], $this->storedFiles());
    }
}
