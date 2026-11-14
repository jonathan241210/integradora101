<?php

namespace Tests\Feature\SpeciesPublication;

use App\Models\Species;
use App\Models\SpeciesPublicationRequest;

class SpeciesPublicationInvariantsTest extends SpeciesPublicationTestCase
{
    private const PUBLICATION_COLUMNS = ['is_published', 'published_at', 'unpublished_at', 'image_path', 'published_fields'];

    /** @return array<string, mixed> */
    private function publicationState(int $id): array
    {
        $row = (array) Species::withTrashed()->toBase()->where('id', $id)->first(self::PUBLICATION_COLUMNS);

        return $row;
    }

    private function speciesIds(): array
    {
        return Species::withTrashed()->orderBy('id')->pluck('id')->all();
    }

    private function newestRequestId(int $speciesId): int
    {
        return (int) SpeciesPublicationRequest::query()->where('species_id', $speciesId)->max('id');
    }

    /** CA-24 */
    public function test_ca24_request_never_creates_or_deletes_species_rows(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $species = $this->makeSpecies();
        $id = $species->id;
        $before = $this->speciesIds();
        $base = self::ADMIN_SPECIES.'/'.$id;

        $steps = [
            'submit' => fn () => $this->submit($vet, $this->submission($species))->assertCreated(),
            'edit' => fn () => $this->actAs($admin)->patchJson(self::ADMIN_REQUESTS.'/'.$this->newestRequestId($id), ['habitat' => 'Selva'])->assertOk(),
            'reject' => fn () => $this->actAs($admin)->postJson(self::ADMIN_REQUESTS.'/'.$this->newestRequestId($id).'/reject', ['rejection_reason' => 'No'])->assertOk(),
            'submit again' => fn () => $this->submit($vet, $this->submission($species))->assertCreated(),
            'accept' => fn () => $this->actAs($admin)->postJson(self::ADMIN_REQUESTS.'/'.$this->newestRequestId($id).'/accept')->assertOk(),
            'unpublish' => fn () => $this->actAs($admin)->postJson($base.'/unpublish')->assertOk(),
            'republish' => fn () => $this->actAs($admin)->postJson($base.'/republish')->assertOk(),
            'unpublish for edit' => fn () => $this->actAs($admin)->postJson($base.'/unpublish')->assertOk(),
            'edit unpublished' => fn () => $this->actAs($admin)->patchJson($base.'/publication', ['habitat' => 'Bosque'])->assertOk(),
            'delete publication' => fn () => $this->actAs($admin)->deleteJson($base.'/publication')->assertOk(),
        ];

        foreach ($steps as $name => $step) {
            $step();
            $this->assertSame($before, $this->speciesIds(), "Species rows changed after: $name");
            $this->assertSame($id, SpeciesPublicationRequest::query()->withTrashed()->latest('id')->value('species_id'), "species_id changed after: $name");
        }

        $this->assertNull(Species::withTrashed()->find($id)->deleted_at);
    }

    /** CA-31 */
    public function test_ca31_publication_columns_change_only_in_publication_actions(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $species = $this->makeSpecies();
        $id = $species->id;
        $base = self::ADMIN_SPECIES.'/'.$id;
        $initial = $this->publicationState($id);

        // Submit, edit and reject leave the publication columns untouched.
        $this->submit($vet, $this->submission($species))->assertCreated();
        $this->assertSame($initial, $this->publicationState($id), 'submit');
        $requestId = $this->newestRequestId($id);
        $this->actAs($admin)->patchJson(self::ADMIN_REQUESTS.'/'.$requestId, ['habitat' => 'Selva'])->assertOk();
        $this->assertSame($initial, $this->publicationState($id), 'edit');
        $this->actAs($admin)->postJson(self::ADMIN_REQUESTS.'/'.$requestId.'/reject', ['rejection_reason' => 'No'])->assertOk();
        $this->assertSame($initial, $this->publicationState($id), 'reject');

        // Accept, unpublish, republish, edit an unpublished sheet and delete do change them.
        $this->submit($vet, $this->submission($species))->assertCreated();
        $this->assertSame($initial, $this->publicationState($id), 'submit again');
        $this->actAs($admin)->postJson(self::ADMIN_REQUESTS.'/'.$this->newestRequestId($id).'/accept')->assertOk();
        $accepted = $this->publicationState($id);
        $this->assertNotSame($initial, $accepted, 'accept');
        $this->assertSame(1, (int) $accepted['is_published']);

        $this->actAs($admin)->postJson($base.'/unpublish')->assertOk();
        $unpublished = $this->publicationState($id);
        $this->assertNotSame($accepted, $unpublished, 'unpublish');
        $this->assertSame(0, (int) $unpublished['is_published']);
        $this->assertNotNull($unpublished['unpublished_at']);

        $this->actAs($admin)->postJson($base.'/republish')->assertOk();
        $republished = $this->publicationState($id);
        $this->assertNotSame($unpublished, $republished, 'republish');
        $this->assertSame(1, (int) $republished['is_published']);

        $this->actAs($admin)->postJson($base.'/unpublish')->assertOk();
        $before = $this->publicationState($id);
        $this->actAs($admin)->post($base.'/publication', ['_method' => 'PATCH', 'image' => $this->png()], ['Accept' => 'application/json'])->assertOk();
        $this->assertNotSame($before['image_path'], $this->publicationState($id)['image_path'], 'edit unpublished');

        $this->actAs($admin)->deleteJson($base.'/publication')->assertOk();
        $deleted = $this->publicationState($id);
        $this->assertSame(0, (int) $deleted['is_published']);
        foreach (['published_at', 'unpublished_at', 'image_path', 'published_fields'] as $column) {
            $this->assertNull($deleted[$column], "delete: $column");
        }
    }
}
