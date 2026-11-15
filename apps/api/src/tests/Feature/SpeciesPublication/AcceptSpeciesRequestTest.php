<?php

namespace Tests\Feature\SpeciesPublication;

use App\Actions\SpeciesPublication\Media\DeleteManagedSpeciesImageAction;
use App\Enums\SpeciesRequestStatus;
use App\Enums\SpeciesRequestType;
use App\Models\Species;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\Models\Activity;

class AcceptSpeciesRequestTest extends SpeciesPublicationTestCase
{
    private function accept(int $requestId, array $payload = [])
    {
        return $this->postJson(self::ADMIN_REQUESTS.'/'.$requestId.'/accept', $payload);
    }

    /** CA-08 */
    public function test_ca08_accept_publishes_existing_species_copies_confirms_and_deletes_original(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $species = $this->makeSpecies(['common_name' => 'Jaguar', 'scientific_name' => 'Antiguo']);
        $pending = $this->putMedia('species-requests', 'new-photo');
        $request = $this->makeRequest($species, $vet, SpeciesRequestStatus::Submitted, [
            'scientific_name' => 'Panthera onca',
            'habitat' => 'Selva',
            'category' => 'mammal',
            'image_path' => $pending,
            'published_fields' => ['habitat'],
        ]);
        $rows = Species::query()->count();

        $this->actAs($admin);
        $response = $this->accept($request->id)->assertOk();

        $response->assertJsonPath('id', $species->id)
            ->assertJsonPath('publication_status', 'published')
            ->assertJsonPath('is_published', true)
            ->assertJsonPath('has_image', true)
            ->assertJsonPath('has_pending_request', false)
            ->assertJsonPath('scientific_name', 'Panthera onca')
            ->assertJsonPath('published_fields', ['habitat']);

        $fresh = $species->fresh();
        $this->assertTrue($fresh->is_published);
        $this->assertNull($fresh->unpublished_at);
        $this->assertNotNull($fresh->published_at);
        $this->assertSame('Selva', $fresh->habitat);
        $this->assertStringStartsWith('species/', $fresh->image_path);
        $this->assertSame(basename($pending), basename($fresh->image_path));
        Storage::disk('media')->assertExists($fresh->image_path);
        Storage::disk('media')->assertMissing($pending);

        $done = $request->fresh();
        $this->assertSame(SpeciesRequestStatus::Accepted, $done->status);
        $this->assertSame($admin->id, $done->reviewed_by);
        $this->assertNotNull($done->reviewed_at);
        $this->assertNull($done->image_path);
        $this->assertSame($rows, Species::query()->count());

        $log = Activity::query()->where('subject_id', $request->id)->where('event', 'species_publication.published')->first();
        $this->assertSame('Especie publicada por '.$admin->full_name.' a partir de la solicitud de '.$vet->full_name, $log->description);
    }

    /** CA-08 */
    public function test_ca08_accept_returns_200_when_original_delete_fails(): void
    {
        $admin = $this->zooAdmin();
        $pending = $this->putMedia('species-requests');
        $request = $this->makeRequest($this->makeSpecies(), $this->veterinarian(), SpeciesRequestStatus::Submitted, ['image_path' => $pending]);

        $this->mock(DeleteManagedSpeciesImageAction::class, function ($mock) use ($pending): void {
            $mock->shouldReceive('execute')->with($pending)->once()->andReturn(false);
            $mock->shouldReceive('execute')->with(null)->andReturn(false);
        });

        $this->actAs($admin);
        $this->accept($request->id)->assertOk()->assertJsonPath('is_published', true);

        $this->assertSame(SpeciesRequestStatus::Accepted, $request->fresh()->status);
        Storage::disk('media')->assertExists($pending);
    }

    /** CA-08 */
    public function test_ca08_origin_is_written_to_distribution(): void
    {
        $admin = $this->zooAdmin();
        $species = $this->makeSpecies(['distribution' => 'Viejo']);
        $request = $this->makeRequest($species, $this->veterinarian(), SpeciesRequestStatus::Submitted, ['origin' => 'Madagascar']);

        $this->actAs($admin);
        $this->accept($request->id)->assertOk()->assertJsonPath('origin', 'Madagascar');

        $this->assertSame('Madagascar', $species->fresh()->distribution);
    }

    /** CA-25 */
    public function test_ca25_accept_writes_effective_category_to_species(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $this->actAs($admin);

        $corrected = $this->makeSpecies(['category' => 'mammal']);
        $withCorrection = $this->makeRequest($corrected, $vet, SpeciesRequestStatus::Submitted, ['category' => 'bird']);
        $this->accept($withCorrection->id)->assertOk()->assertJsonPath('category', 'bird');
        $this->assertSame('bird', $corrected->fresh()->category);

        $kept = $this->makeSpecies(['category' => 'reptile']);
        $withoutCorrection = $this->makeRequest($kept, $vet);
        $this->accept($withoutCorrection->id)->assertOk();
        $this->assertSame('reptile', $kept->fresh()->category);
    }

    /** CA-32 */
    public function test_ca32_update_keeps_published_version_until_accept(): void
    {
        $vet = $this->veterinarian();
        $species = $this->makePublishedSpecies(['habitat' => 'Original', 'category' => 'mammal']);
        $this->makeRequest($species, $vet, SpeciesRequestStatus::Submitted, ['request_type' => SpeciesRequestType::Update, 'habitat' => 'Nuevo']);

        $fresh = $species->fresh();
        $this->assertTrue($fresh->is_published);
        $this->assertSame('Original', $fresh->habitat);
        $this->assertSame(['scientific_name', 'origin', 'habitat'], $fresh->published_fields);
    }

    /** CA-32 */
    public function test_ca32_update_accept_replaces_data_and_keeps_species_listed(): void
    {
        $admin = $this->zooAdmin();
        $oldPhoto = $this->putMedia('species');
        $species = $this->makePublishedSpecies(['habitat' => 'Original', 'image_path' => $oldPhoto, 'published_at' => now()->subDays(5)]);
        $pending = $this->putMedia('species-requests');
        $request = $this->makeRequest($species, $this->veterinarian(), SpeciesRequestStatus::Submitted, [
            'request_type' => SpeciesRequestType::Update,
            'habitat' => 'Nuevo',
            'image_path' => $pending,
            'published_fields' => ['origin'],
        ]);

        $this->actAs($admin);
        $this->accept($request->id)->assertOk()->assertJsonPath('publication_status', 'published');

        $fresh = $species->fresh();
        $this->assertTrue($fresh->is_published);
        $this->assertNull($fresh->unpublished_at);
        $this->assertSame('Nuevo', $fresh->habitat);
        $this->assertSame(['origin'], $fresh->published_fields);
        $this->assertTrue($fresh->published_at->isAfter(now()->subMinute()));
        $this->assertNotSame($oldPhoto, $fresh->image_path);
        Storage::disk('media')->assertExists($fresh->image_path);
        Storage::disk('media')->assertMissing($oldPhoto);
        Storage::disk('media')->assertMissing($pending);

        $log = Activity::query()->where('subject_id', $request->id)->where('event', 'species_publication.update_accepted')->first();
        $this->assertStringStartsWith('Actualización publicada por', $log->description);
    }

    /** CA-32 */
    public function test_ca32_update_without_photo_keeps_current_image(): void
    {
        $admin = $this->zooAdmin();
        $photo = $this->putMedia('species');
        $species = $this->makePublishedSpecies(['image_path' => $photo]);
        $request = $this->makeRequest($species, $this->veterinarian(), SpeciesRequestStatus::Submitted, ['request_type' => SpeciesRequestType::Update, 'habitat' => 'Nuevo']);

        $this->actAs($admin);
        $this->accept($request->id)->assertOk();

        $this->assertSame($photo, $species->fresh()->image_path);
        Storage::disk('media')->assertExists($photo);
    }
}
