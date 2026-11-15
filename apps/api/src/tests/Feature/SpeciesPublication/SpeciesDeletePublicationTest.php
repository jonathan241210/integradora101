<?php

namespace Tests\Feature\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;
use App\Models\Species;
use App\Models\SpeciesPublicationRequest;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\Models\Activity;

class SpeciesDeletePublicationTest extends SpeciesPublicationTestCase
{
    /** CA-38 */
    public function test_ca38_delete_publication_keeps_species_row_and_soft_deletes_requests(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $photo = $this->putMedia('species');
        $species = $this->makePublishedSpecies(['image_path' => $photo, 'habitat' => 'Corregido']);
        $accepted = $this->makeRequest($species, $vet, SpeciesRequestStatus::Accepted);
        $rejected = $this->makeRequest($species, $vet, SpeciesRequestStatus::Rejected, ['rejection_reason' => 'No']);
        $rows = Species::query()->count();
        $url = self::ADMIN_SPECIES.'/'.$species->id.'/publication';

        $this->actAs($admin)->deleteJson($url)->assertOk()
            ->assertJsonPath('publication_status', 'not_published')
            ->assertJsonPath('is_published', false)
            ->assertJsonPath('has_image', false)
            ->assertJsonPath('published_fields', []);

        $fresh = $species->fresh();
        $this->assertNotNull($fresh);
        $this->assertSame($rows, Species::query()->count());
        $this->assertFalse($fresh->is_published);
        $this->assertNull($fresh->published_at);
        $this->assertNull($fresh->unpublished_at);
        $this->assertNull($fresh->image_path);
        $this->assertNull($fresh->published_fields);
        $this->assertSame('Corregido', $fresh->habitat);
        Storage::disk('media')->assertMissing($photo);

        $this->assertSame(0, SpeciesPublicationRequest::query()->where('species_id', $species->id)->count());
        $this->assertSame(2, SpeciesPublicationRequest::withTrashed()->where('species_id', $species->id)->count());
        $this->assertNotNull(SpeciesPublicationRequest::withTrashed()->find($accepted->id)->deleted_at);

        $mine = array_column($this->actAs($vet)->getJson(self::VET_REQUESTS)->assertOk()->json('data'), 'id');
        $this->assertNotContains($accepted->id, $mine);
        $this->assertNotContains($rejected->id, $mine);
        $listed = array_column($this->actAs($admin)->getJson(self::ADMIN_REQUESTS)->assertOk()->json('data'), 'id');
        $this->assertNotContains($rejected->id, $listed);

        $this->actAs($admin)->deleteJson($url)->assertStatus(422)
            ->assertJsonPath('message', 'Esta especie no tiene publicación que eliminar.');
    }

    /** CA-38 */
    public function test_ca38_submitted_requests_are_rejected_then_soft_deleted_and_new_request_is_allowed(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $photo = $this->putMedia('species');
        $pendingPhoto = $this->putMedia('species-requests');
        $species = $this->makeUnpublishedSpecies(['image_path' => $photo]);
        $submitted = $this->makeRequest($species, $vet, SpeciesRequestStatus::Submitted, ['image_path' => $pendingPhoto]);

        $this->actAs($admin)->deleteJson(self::ADMIN_SPECIES.'/'.$species->id.'/publication')->assertOk()
            ->assertJsonPath('publication_status', 'not_published')->assertJsonPath('has_pending_request', false);

        $row = SpeciesPublicationRequest::withTrashed()->find($submitted->id);
        $this->assertSame(SpeciesRequestStatus::Rejected, $row->status);
        $this->assertSame('La publicación fue eliminada por la Dirección.', $row->rejection_reason);
        $this->assertSame($admin->id, $row->reviewed_by);
        $this->assertNotNull($row->reviewed_at);
        $this->assertNotNull($row->deleted_at);
        $this->assertNull($row->image_path);
        $this->assertSame([], Storage::disk('media')->allFiles());

        $log = Activity::query()->where('subject_id', $species->id)->where('event', 'species_publication.deleted')->first();
        $this->assertSame('Publicación de especie eliminada por '.$admin->full_name, $log->description);
        $this->assertSame([$submitted->id], $log->properties['request_ids']);
        $this->assertSame([$submitted->id], $log->properties['rejected_request_ids']);

        // The species accepts a new publish request (CA-28).
        $this->submit($vet, $this->submission($species))->assertCreated()->assertJsonPath('data.request_type', 'publish');
    }
}
