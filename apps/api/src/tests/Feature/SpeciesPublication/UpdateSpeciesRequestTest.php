<?php

namespace Tests\Feature\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;
use App\Models\SpeciesPublicationRequest;
use Spatie\Activitylog\Models\Activity;

class UpdateSpeciesRequestTest extends SpeciesPublicationTestCase
{
    private function url(SpeciesPublicationRequest $request): string
    {
        return self::ADMIN_REQUESTS.'/'.$request->id;
    }

    /** CA-14 */
    public function test_ca14_patch_request_only_for_review_permission(): void
    {
        $vet = $this->veterinarian();
        $request = $this->makeRequest($this->makeSpecies(), $vet);

        foreach (['admin', 'executive', 'cashier', 'veterinarian'] as $role) {
            $this->actAs($this->createAccount($role))->patchJson($this->url($request), ['habitat' => 'Cambio'])->assertForbidden();
        }
        $this->app['auth']->forgetGuards();
        $this->patchJson($this->url($request), ['habitat' => 'Cambio'])->assertUnauthorized();
        $this->assertNull($request->fresh()->habitat);

        $this->actAs($this->zooAdmin())->patchJson($this->url($request), ['habitat' => 'Cambio'])->assertOk();
        $this->assertSame('Cambio', $request->fresh()->habitat);
    }

    /** CA-15 */
    public function test_ca15_patch_saves_trimmed_values_and_keeps_status(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $request = $this->makeRequest($this->makeSpecies(['category' => 'mammal']), $vet);

        $response = $this->actAs($admin)->patchJson($this->url($request), [
            'scientific_name' => '  Panthera leo  ',
            'habitat' => ' Sabana ',
            'origin' => ' África ',
            'category' => ' bird ',
            'published_fields' => ['habitat'],
        ])->assertOk();

        $response->assertJsonPath('status', 'submitted')
            ->assertJsonPath('proposed.scientific_name', 'Panthera leo')
            ->assertJsonPath('proposed.habitat', 'Sabana')
            ->assertJsonPath('proposed.origin', 'África')
            ->assertJsonPath('proposed.category', 'bird')
            ->assertJsonPath('published_fields', ['habitat']);

        $fresh = $request->fresh();
        $this->assertSame(SpeciesRequestStatus::Submitted, $fresh->status);
        $this->assertSame('publish', $fresh->request_type->value);
        $this->assertSame($vet->id, $fresh->created_by);
        $this->assertSame($admin->id, $fresh->updated_by);
        $this->assertNull($fresh->reviewed_by);
        $this->assertSame('Sabana', $fresh->habitat);

        $this->actAs($admin)->patchJson($this->url($request), [])->assertStatus(422)->assertJsonPath('message', 'Nada que guardar.');
    }

    /** CA-16 */
    public function test_ca16_patch_validation_in_spanish(): void
    {
        $admin = $this->zooAdmin();
        $request = $this->makeRequest($this->makeSpecies(), $this->veterinarian());
        $long = str_repeat('a', 151);

        $cases = [
            [['scientific_name' => $long], 'Nombre científico: máximo 150 caracteres.'],
            [['habitat' => $long], 'Hábitat: máximo 150 caracteres.'],
            [['origin' => $long], 'Área de distribución natural: máximo 150 caracteres.'],
            [['category' => 'dragon'], 'Tipo de animal no válido.'],
            [['common_name' => 'Otro'], 'Campo no editable: common_name.'],
            [['species_id' => 1], 'Campo no editable: species_id.'],
            [['status' => 'accepted'], 'Campo no editable: status.'],
            [['created_by' => 1], 'Campo no editable: created_by.'],
            [['published_fields' => ['category']], 'Campo no permitido en la ficha pública: category.'],
            [['published_fields' => 'no-json'], 'La selección de campos públicos no es válida.'],
        ];

        foreach ($cases as [$payload, $message]) {
            $this->actAs($admin)->patchJson($this->url($request), $payload)->assertStatus(422)->assertJsonPath('message', $message);
        }

        $fresh = $request->fresh();
        $this->assertNull($fresh->habitat);
        $this->assertNull($fresh->scientific_name);
        $this->assertSame(0, Activity::query()->where('subject_type', SpeciesPublicationRequest::class)->where('subject_id', $request->id)->count());
    }

    /** CA-17 */
    public function test_ca17_patch_only_when_submitted(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();

        foreach ([SpeciesRequestStatus::Accepted, SpeciesRequestStatus::Rejected] as $status) {
            $request = $this->makeRequest($this->makeSpecies(), $vet, $status);

            $this->actAs($admin)->patchJson($this->url($request), ['habitat' => 'Tarde'])
                ->assertStatus(422)->assertJsonPath('message', 'Esta solicitud ya fue revisada.');
            $this->assertNull($request->fresh()->habitat);
        }

        $this->actAs($admin)->patchJson(self::ADMIN_REQUESTS.'/999999999', ['habitat' => 'x'])
            ->assertNotFound()->assertJsonPath('message', 'Solicitud no encontrada.');
    }

    /** CA-25 */
    public function test_ca25_update_replaces_category_and_audits_change(): void
    {
        $admin = $this->zooAdmin();
        $species = $this->makeSpecies(['category' => 'mammal']);
        $request = $this->makeRequest($species, $this->veterinarian(), SpeciesRequestStatus::Submitted, ['category' => 'bird']);

        $this->actAs($admin)->patchJson($this->url($request), ['category' => 'reptile'])
            ->assertOk()->assertJsonPath('proposed.category', 'reptile');
        $this->assertSame('reptile', $request->fresh()->category);

        $activity = Activity::query()
            ->where('subject_type', SpeciesPublicationRequest::class)->where('subject_id', $request->id)
            ->where('event', 'species_publication.edited')->latest('id')->first();
        $this->assertNotNull($activity);
        $this->assertSame('bird', $activity->properties['old']['category']);
        $this->assertSame('reptile', $activity->properties['new']['category']);

        // Equal to the species value: stored as NULL (CA-30).
        $this->actAs($admin)->patchJson($this->url($request), ['category' => 'mammal'])->assertOk();
        $this->assertNull($request->fresh()->category);
    }

    /** CA-25 */
    public function test_ca25_update_rejects_empty_or_unknown_category(): void
    {
        $admin = $this->zooAdmin();
        $request = $this->makeRequest($this->makeSpecies(), $this->veterinarian(), SpeciesRequestStatus::Submitted, ['category' => 'bird']);

        foreach (['', null, '   '] as $empty) {
            $this->actAs($admin)->patchJson($this->url($request), ['category' => $empty])
                ->assertStatus(422)->assertJsonPath('message', 'Tipo de animal requerido.');
        }
        $this->actAs($admin)->patchJson($this->url($request), ['category' => 'unicorn'])
            ->assertStatus(422)->assertJsonPath('message', 'Tipo de animal no válido.')->assertJsonValidationErrors('category');

        $this->assertSame('bird', $request->fresh()->category);
    }
}
