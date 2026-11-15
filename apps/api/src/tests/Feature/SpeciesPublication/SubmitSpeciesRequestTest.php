<?php

namespace Tests\Feature\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;
use App\Models\Species;
use App\Models\SpeciesPublicationRequest;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\Models\Activity;

class SubmitSpeciesRequestTest extends SpeciesPublicationTestCase
{
    /** CA-01 */
    public function test_ca01_veterinarian_submits_publication_request(): void
    {
        $vet = $this->veterinarian();
        $species = $this->makeSpecies();

        $this->post(self::VET_REQUESTS, $this->submission($species), ['Accept' => 'application/json'])->assertUnauthorized();

        $response = $this->submit($vet, $this->submission($species, [
            'scientific_name' => 'Panthera onca',
            'habitat' => 'Selva',
            'origin' => 'America',
            'published_fields' => '["scientific_name","origin"]',
        ]))->assertCreated();

        $response->assertJsonStructure(['data' => ['id', 'species_id', 'status', 'request_type', 'created_at']])
            ->assertJsonPath('data.species_id', $species->id)
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.request_type', 'publish');

        $row = SpeciesPublicationRequest::query()->findOrFail($response->json('data.id'));
        $this->assertSame($vet->id, $row->created_by);
        $this->assertSame('Panthera onca', $row->scientific_name);
        $this->assertSame('Selva', $row->habitat);
        $this->assertSame('America', $row->origin);
        $this->assertSame('mammal', $row->category);
        $this->assertSame(['scientific_name', 'origin'], $row->published_fields);

        $this->assertTrue(Activity::query()
            ->where('log_name', 'admin')
            ->where('event', 'species_publication.submitted')
            ->where('subject_id', $row->id)
            ->exists());

        // Roles and session (CA-12 covers the rest of the routes).
        $this->submit($this->createAccount('admin'), $this->submission($this->makeSpecies()))->assertForbidden();
    }

    /** CA-02 */
    public function test_ca02_submit_stores_photo_and_keeps_species_unchanged(): void
    {
        $vet = $this->veterinarian();
        $species = $this->makePublishedSpecies(['distribution' => 'Asia', 'habitat' => 'Bosque']);
        $before = $species->fresh()->getAttributes();
        $speciesCount = Species::withTrashed()->count();

        $response = $this->submit($vet, $this->submission($species, ['habitat' => 'Montaña']))->assertCreated();

        $this->assertStringNotContainsString('image', json_encode($response->json()));
        $this->assertStringNotContainsString('http', json_encode($response->json()));

        $row = SpeciesPublicationRequest::query()->findOrFail($response->json('data.id'));
        $this->assertMatchesRegularExpression('#^species-requests/[0-9a-f-]{36}\.jpg$#', $row->image_path);
        Storage::disk('media')->assertExists($row->image_path);

        $this->assertSame($before, $species->fresh()->getAttributes());
        $this->assertSame($speciesCount, Species::withTrashed()->count());
    }

    /** CA-27 */
    public function test_ca27_eligibility_by_publication_status(): void
    {
        $vet = $this->veterinarian();
        $noImage = fn ($species) => array_diff_key($this->submission($species), ['image' => 1]);

        $notPublished = $this->makeSpecies();
        $this->submit($vet, $this->submission($notPublished))->assertCreated()->assertJsonPath('data.request_type', 'publish');

        $published = $this->makePublishedSpecies();
        $this->submit($vet, $noImage($published))->assertCreated()->assertJsonPath('data.request_type', 'update');

        $unpublished = $this->makeUnpublishedSpecies();
        $this->submit($vet, $noImage($unpublished))->assertCreated()->assertJsonPath('data.request_type', 'update');

        $pending = $this->makeSpecies();
        $this->makeRequest($pending, $vet);
        $count = SpeciesPublicationRequest::query()->where('species_id', $pending->id)->count();
        $response = $this->submit($vet, $this->submission($pending))->assertStatus(422);
        $this->assertSame('Ya hay una solicitud pendiente para esta especie.', $response->json('errors.species_id.0'));
        $this->assertSame($count, SpeciesPublicationRequest::query()->where('species_id', $pending->id)->count());
    }

    /** CA-28 */
    public function test_ca28_rejected_species_accepts_new_publish_request(): void
    {
        $vet = $this->veterinarian();
        $species = $this->makeSpecies();
        $rejected = $this->makeRequest($species, $vet, SpeciesRequestStatus::Rejected, ['rejection_reason' => 'Foto borrosa']);
        $snapshot = $rejected->getAttributes();

        $response = $this->submit($vet, $this->submission($species))->assertCreated();

        $response->assertJsonPath('data.request_type', 'publish');
        $this->assertNotSame($rejected->id, $response->json('data.id'));
        $this->assertSame($snapshot, $rejected->fresh()->getAttributes());
    }

    /** CA-30 */
    public function test_ca30_unchanged_or_empty_correction_is_stored_as_null(): void
    {
        $vet = $this->veterinarian();
        $species = $this->makeSpecies([
            'scientific_name' => 'Leo leo',
            'habitat' => 'Sabana',
            'distribution' => 'Africa',
            'category' => 'mammal',
        ]);

        $id = $this->submit($vet, $this->submission($species, [
            'scientific_name' => 'Leo leo',
            'habitat' => '',
            'origin' => '  Asia  ',
            'category' => 'mammal',
        ]))->assertCreated()->json('data.id');

        $row = SpeciesPublicationRequest::query()->findOrFail($id);
        $this->assertNull($row->scientific_name);
        $this->assertNull($row->habitat);
        $this->assertSame('Asia', $row->origin);
        $this->assertNull($row->category);

        $other = $this->makeSpecies(['category' => 'mammal']);
        $id = $this->submit($vet, $this->submission($other, ['category' => 'bird']))->assertCreated()->json('data.id');
        $this->assertSame('bird', SpeciesPublicationRequest::query()->findOrFail($id)->category);
    }

    /** CA-32 */
    public function test_ca32_update_keeps_published_version_until_accept(): void
    {
        $vet = $this->veterinarian();
        $species = $this->makePublishedSpecies(['habitat' => 'Bosque']);
        $before = $species->fresh()->getAttributes();

        $response = $this->submit($vet, $this->submission($species, ['habitat' => 'Desierto']))->assertCreated();

        $response->assertJsonPath('data.request_type', 'update');
        $fresh = $species->fresh();
        $this->assertSame($before, $fresh->getAttributes());
        $this->assertTrue($fresh->is_published);
    }
}
