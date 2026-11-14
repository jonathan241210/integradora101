<?php

namespace Tests\Feature\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\Models\Activity;

class SpeciesPublicationManagementTest extends SpeciesPublicationTestCase
{
    /** CA-35 */
    public function test_ca35_unpublish_hides_species_without_deleting_data(): void
    {
        $admin = $this->zooAdmin();
        $photo = $this->putMedia('species');
        $publishedAt = now()->subDays(3)->startOfSecond();
        $species = $this->makePublishedSpecies(['image_path' => $photo, 'published_at' => $publishedAt]);
        $accepted = $this->makeRequest($species, $this->veterinarian(), SpeciesRequestStatus::Accepted);
        $url = self::ADMIN_SPECIES.'/'.$species->id.'/unpublish';

        $this->actAs($admin)->postJson($url)->assertOk()
            ->assertJsonPath('publication_status', 'unpublished')
            ->assertJsonPath('is_published', false)
            ->assertJsonPath('has_image', true);

        $fresh = $species->fresh();
        $this->assertFalse($fresh->is_published);
        $this->assertNotNull($fresh->unpublished_at);
        $this->assertSame($photo, $fresh->image_path);
        $this->assertSame(['scientific_name', 'origin', 'habitat'], $fresh->published_fields);
        $this->assertEquals($publishedAt, $fresh->published_at);
        Storage::disk('media')->assertExists($photo);
        $this->assertSame(SpeciesRequestStatus::Accepted, $accepted->fresh()->status);

        $log = Activity::query()->where('subject_id', $species->id)->where('event', 'species_publication.unpublished')->first();
        $this->assertSame('Especie despublicada por '.$admin->full_name, $log->description);

        $this->actAs($admin)->postJson($url)->assertStatus(422)->assertJsonPath('message', 'Esta especie no está publicada.');
        $never = $this->makeSpecies();
        $this->actAs($admin)->postJson(self::ADMIN_SPECIES.'/'.$never->id.'/unpublish')->assertStatus(422);
        $this->actAs($admin)->postJson(self::ADMIN_SPECIES.'/999999999/unpublish')->assertNotFound()->assertJsonPath('message', 'Especie no encontrada.');
    }

    /** CA-36 */
    public function test_ca36_republish_without_new_request_and_guards(): void
    {
        $admin = $this->zooAdmin();
        $this->actAs($admin);
        $url = fn ($species) => self::ADMIN_SPECIES.'/'.$species->id.'/republish';

        $species = $this->makeUnpublishedSpecies(['published_at' => now()->subDays(8)]);
        $this->postJson($url($species))->assertOk()
            ->assertJsonPath('publication_status', 'published')->assertJsonPath('is_published', true);
        $fresh = $species->fresh();
        $this->assertNull($fresh->unpublished_at);
        $this->assertTrue($fresh->published_at->isAfter(now()->subMinute()));
        $this->assertSame(0, $species->publicationRequests()->count());
        $this->assertNotNull(Activity::query()->where('subject_id', $species->id)->where('event', 'species_publication.republished')->first());

        $this->postJson($url($species))->assertStatus(422)->assertJsonPath('message', 'Esta especie ya está publicada.');

        $never = $this->makeSpecies();
        $this->postJson($url($never))->assertStatus(422)
            ->assertJsonPath('message', 'Esta especie no tiene una ficha publicada para restaurar.');

        $noPhoto = $this->makeUnpublishedSpecies(['image_path' => null]);
        $this->postJson($url($noPhoto))->assertStatus(422)
            ->assertJsonPath('message', 'No se puede republicar: faltan la foto o los datos publicados.');
        $noData = $this->makeUnpublishedSpecies(['published_fields' => null]);
        $this->postJson($url($noData))->assertStatus(422)
            ->assertJsonPath('message', 'No se puede republicar: faltan la foto o los datos publicados.');

        $pending = $this->makeUnpublishedSpecies();
        $this->makeRequest($pending, $this->veterinarian());
        $this->postJson($url($pending))->assertStatus(422)
            ->assertJsonPath('message', 'Hay una solicitud pendiente para esta especie. Decide sobre ella antes de republicar.');

        // After adding the photo (CA-37) the species can be republished.
        $this->patchJson(self::ADMIN_SPECIES.'/'.$noPhoto->id.'/publication', ['image' => $this->jpeg()])->assertOk();
        $this->postJson($url($noPhoto))->assertOk()->assertJsonPath('is_published', true);
    }

    /** CA-41 */
    public function test_ca41_publication_actions_recheck_state_inside_lock(): void
    {
        $admin = $this->zooAdmin();
        $this->actAs($admin);

        $species = $this->makePublishedSpecies();
        $this->postJson(self::ADMIN_SPECIES.'/'.$species->id.'/unpublish')->assertOk();
        $this->postJson(self::ADMIN_SPECIES.'/'.$species->id.'/unpublish')->assertStatus(422);
        $this->postJson(self::ADMIN_SPECIES.'/'.$species->id.'/republish')->assertOk();
        $this->postJson(self::ADMIN_SPECIES.'/'.$species->id.'/republish')->assertStatus(422);

        $request = $this->makeRequest($species, $this->veterinarian());
        $this->deleteJson(self::ADMIN_SPECIES.'/'.$species->id.'/publication')->assertOk();
        $this->postJson(self::ADMIN_REQUESTS.'/'.$request->id.'/accept')->assertNotFound()
            ->assertJsonPath('message', 'Solicitud no encontrada.');
        $this->patchJson(self::ADMIN_REQUESTS.'/'.$request->id, ['habitat' => 'x'])->assertNotFound();
    }
}
