<?php

namespace Tests\Feature\SpeciesPublication;

use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\Models\Activity;

class SpeciesUnpublishedEditTest extends SpeciesPublicationTestCase
{
    private function url(int $id): string
    {
        return self::ADMIN_SPECIES.'/'.$id.'/publication';
    }

    /** CA-37 */
    public function test_ca37_edit_unpublished_species_without_publishing(): void
    {
        $admin = $this->zooAdmin();
        $species = $this->makeUnpublishedSpecies([
            'common_name' => 'Tigre',
            'scientific_name' => 'Panthera tigris',
            'habitat' => 'Selva',
            'distribution' => 'Asia',
            'category' => 'mammal',
        ]);
        $this->actAs($admin);

        $this->getJson($this->url($species->id))->assertOk()
            ->assertJsonPath('common_name', 'Tigre')
            ->assertJsonPath('origin', 'Asia')
            ->assertJsonPath('publication_status', 'unpublished')
            ->assertJsonPath('has_pending_request', false);

        $this->patchJson($this->url($species->id), [
            'scientific_name' => ' Nuevo nombre ',
            'habitat' => '',
            'origin' => 'India',
            'category' => 'reptile',
            'published_fields' => ['origin'],
        ])->assertOk()
            ->assertJsonPath('scientific_name', 'Nuevo nombre')
            ->assertJsonPath('habitat', null)
            ->assertJsonPath('origin', 'India')
            ->assertJsonPath('category', 'reptile')
            ->assertJsonPath('published_fields', ['origin'])
            ->assertJsonPath('is_published', false)
            ->assertJsonPath('publication_status', 'unpublished');

        $fresh = $species->fresh();
        $this->assertFalse($fresh->is_published);
        $this->assertNotNull($fresh->unpublished_at);
        $this->assertNull($fresh->habitat);
        $this->assertSame('India', $fresh->distribution);
        $this->assertSame('Tigre', $fresh->common_name);

        $log = Activity::query()->where('subject_id', $species->id)->where('event', 'species_publication.unpublished_edited')->first();
        $this->assertSame('Ficha de especie despublicada editada por '.$admin->full_name, $log->description);
        $this->assertSame('Selva', $log->properties['old']['habitat']);
        $this->assertNull($log->properties['new']['habitat']);

        // No real change: 200 and no new audit row.
        $count = Activity::query()->where('subject_id', $species->id)->where('event', 'species_publication.unpublished_edited')->count();
        $this->patchJson($this->url($species->id), ['origin' => 'India'])->assertOk();
        $this->assertSame($count, Activity::query()->where('subject_id', $species->id)->where('event', 'species_publication.unpublished_edited')->count());

        $this->patchJson($this->url($species->id), [])->assertStatus(422)->assertJsonPath('message', 'Nada que guardar.');
        $this->patchJson($this->url($species->id), ['common_name' => 'X'])->assertStatus(422)->assertJsonPath('message', 'Campo no editable: common_name.');
        $this->patchJson($this->url($species->id), ['category' => ''])->assertStatus(422)->assertJsonPath('message', 'Tipo de animal requerido.');

        $published = $this->makePublishedSpecies();
        $this->patchJson($this->url($published->id), ['habitat' => 'x'])->assertStatus(422)
            ->assertJsonPath('message', 'Despublica la especie antes de editar su ficha pública.');
        $never = $this->makeSpecies();
        $this->patchJson($this->url($never->id), ['habitat' => 'x'])->assertStatus(422)
            ->assertJsonPath('message', 'Esta especie no tiene una ficha publicada que editar.');
        $pending = $this->makeUnpublishedSpecies();
        $this->makeRequest($pending, $this->veterinarian());
        $this->patchJson($this->url($pending->id), ['habitat' => 'x'])->assertStatus(422)
            ->assertJsonPath('message', 'Hay una solicitud pendiente para esta especie. Decide sobre ella antes de editar.');
    }

    /** CA-37 */
    public function test_ca37_new_photo_saved_in_species_folder_and_old_deleted_after_commit(): void
    {
        $admin = $this->zooAdmin();
        $old = $this->putMedia('species');
        $species = $this->makeUnpublishedSpecies(['image_path' => $old]);

        $this->actAs($admin)->post($this->url($species->id), ['_method' => 'PATCH', 'image' => $this->png()], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('has_image', true)->assertJsonPath('is_published', false);

        $new = $species->fresh()->image_path;
        $this->assertNotSame($old, $new);
        $this->assertStringStartsWith('species/', $new);
        Storage::disk('media')->assertExists($new);
        Storage::disk('media')->assertMissing($old);
        $this->assertSame([$new], Storage::disk('media')->allFiles());

        // Rejected state: the new file is removed and the previous one stays.
        $published = $this->makePublishedSpecies(['image_path' => $new]);
        $this->actAs($admin)->post($this->url($published->id), ['_method' => 'PATCH', 'image' => $this->jpeg()], ['Accept' => 'application/json'])
            ->assertStatus(422);
        $this->assertSame([$new], Storage::disk('media')->allFiles());
    }
}
