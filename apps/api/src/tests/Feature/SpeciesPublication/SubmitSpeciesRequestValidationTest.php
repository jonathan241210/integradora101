<?php

namespace Tests\Feature\SpeciesPublication;

use App\Models\Species;
use App\Models\SpeciesPublicationRequest;
use Illuminate\Http\UploadedFile;

class SubmitSpeciesRequestValidationTest extends SpeciesPublicationTestCase
{
    private function assertRejected($response, string $field, string $message): void
    {
        $response->assertStatus(422);
        $this->assertSame($message, $response->json("errors.{$field}.0"), "Mensaje de {$field}");
    }

    private function assertNothingCreated(int $requests, int $species): void
    {
        $this->assertSame($requests, SpeciesPublicationRequest::query()->count());
        $this->assertSame($species, Species::withTrashed()->count());
        $this->assertSame([], $this->storedFiles());
    }

    /** CA-03 */
    public function test_ca03_submit_returns_422_messages_in_spanish(): void
    {
        $vet = $this->veterinarian();
        $species = $this->makeSpecies();
        $requests = SpeciesPublicationRequest::query()->count();
        $speciesCount = Species::withTrashed()->count();

        $payload = $this->submission($species);
        unset($payload['species_id']);
        $this->assertRejected($this->submit($vet, $payload), 'species_id', 'Elige una especie.');

        $this->assertRejected($this->submit($vet, $this->submission($species, ['species_id' => 987654321])), 'species_id', 'La especie no existe.');

        $deleted = $this->makeSpecies();
        $deleted->delete();
        $speciesCount = Species::withTrashed()->count();
        $this->assertRejected($this->submit($vet, $this->submission($deleted)), 'species_id', 'La especie no existe.');

        $pending = $this->makeSpecies();
        $this->makeRequest($pending, $vet);
        $requests = SpeciesPublicationRequest::query()->count();
        $speciesCount = Species::withTrashed()->count();
        $this->assertRejected($this->submit($vet, $this->submission($pending)), 'species_id', 'Ya hay una solicitud pendiente para esta especie.');

        $this->assertRejected($this->submit($vet, $this->submission($species, ['category' => null])), 'category', 'Tipo de animal requerido.');
        $this->assertRejected($this->submit($vet, $this->submission($species, ['category' => 'dragon'])), 'category', 'Tipo de animal no válido.');

        $long = str_repeat('a', 151);
        $this->assertRejected($this->submit($vet, $this->submission($species, ['scientific_name' => $long])), 'scientific_name', 'Nombre científico: máximo 150 caracteres.');
        $this->assertRejected($this->submit($vet, $this->submission($species, ['habitat' => $long])), 'habitat', 'Hábitat: máximo 150 caracteres.');
        $this->assertRejected($this->submit($vet, $this->submission($species, ['origin' => $long])), 'origin', 'Área de distribución natural: máximo 150 caracteres.');

        $payload = $this->submission($species);
        unset($payload['image']);
        $this->assertRejected($this->submit($vet, $payload), 'image', 'Elige una foto para la primera publicación.');

        $this->assertRejected(
            $this->submit($vet, $this->submission($species, ['image' => $this->corruptImage()])),
            'image',
            'No se pudo procesar la foto. Intenta con otro archivo.',
        );

        $this->assertRejected($this->submit($vet, $this->submission($species, ['common_name' => 'Otro'])), 'common_name', 'Campo no permitido: common_name.');
        $this->assertRejected($this->submit($vet, $this->submission($species, ['species' => 'Otro'])), 'species', 'Campo no permitido: species.');

        $this->assertNothingCreated($requests, $speciesCount);
    }

    /** CA-04 */
    public function test_ca04_photo_rules_jpeg_png_5mb_required_only_for_publish(): void
    {
        $vet = $this->veterinarian();
        $message = 'No se pudo procesar la foto. Intenta con otro archivo.';

        $this->submit($vet, $this->submission($this->makeSpecies(), ['image' => $this->jpeg()]))->assertCreated();
        $this->submit($vet, $this->submission($this->makeSpecies(), ['image' => $this->png()]))->assertCreated();
        $this->submit($vet, $this->submission($this->makeSpecies(), ['image' => $this->jpeg()->size(5120)]))->assertCreated();

        $this->assertRejected($this->submit($vet, $this->submission($this->makeSpecies(), ['image' => $this->jpeg()->size(5121)])), 'image', $message);
        $this->assertRejected($this->submit($vet, $this->submission($this->makeSpecies(), ['image' => UploadedFile::fake()->image('a.gif', 20, 20)])), 'image', $message);
        $this->assertRejected($this->submit($vet, $this->submission($this->makeSpecies(), ['image' => UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')])), 'image', $message);

        // An update (published or unpublished species) does not need a photo.
        $published = $this->makePublishedSpecies();
        $payload = $this->submission($published);
        unset($payload['image']);
        $this->submit($vet, $payload)->assertCreated()->assertJsonPath('data.request_type', 'update');

        $unpublished = $this->makeUnpublishedSpecies();
        $payload = $this->submission($unpublished);
        unset($payload['image']);
        $this->submit($vet, $payload)->assertCreated()->assertJsonPath('data.request_type', 'update');

        // A publish request without photo is rejected.
        $payload = $this->submission($this->makeSpecies());
        unset($payload['image']);
        $this->assertRejected($this->submit($vet, $payload), 'image', 'Elige una foto para la primera publicación.');
    }

    /** CA-21 */
    public function test_ca21_published_fields_validation(): void
    {
        $vet = $this->veterinarian();
        $stored = function (array $override): array {
            return SpeciesPublicationRequest::query()
                ->where('species_id', $override['species_id'])
                ->firstOrFail()->published_fields;
        };

        $species = $this->makeSpecies();
        $this->submit($vet, $this->submission($species, ['published_fields' => '["origin","habitat","origin"]']))->assertCreated();
        $this->assertSame(['origin', 'habitat'], $stored(['species_id' => $species->id]));

        foreach (['' => 'empty string', '[]' => 'empty array'] as $value => $label) {
            $species = $this->makeSpecies();
            $this->submit($vet, $this->submission($species, ['published_fields' => $value]))->assertCreated();
            $this->assertSame([], $stored(['species_id' => $species->id]), $label);
        }

        $species = $this->makeSpecies();
        $this->submit($vet, $this->submission($species))->assertCreated();
        $this->assertSame(['scientific_name', 'origin', 'habitat'], $stored(['species_id' => $species->id]), 'defaults');

        $species = $this->makeSpecies();
        foreach (['common_name', 'category', 'image', 'conservation_status'] as $key) {
            $this->assertRejected(
                $this->submit($vet, $this->submission($species, ['published_fields' => json_encode(['origin', $key])])),
                'published_fields',
                "Campo no permitido en la ficha pública: {$key}.",
            );
        }

        foreach (['no-json', '{"a":"origin"}', '[1,2]', '"origin"'] as $invalid) {
            $this->assertRejected(
                $this->submit($vet, $this->submission($species, ['published_fields' => $invalid])),
                'published_fields',
                'La selección de campos públicos no es válida.',
            );
        }

        $this->assertSame(0, SpeciesPublicationRequest::query()->where('species_id', $species->id)->count());
    }

    /** CA-25 */
    public function test_ca25_store_requires_category(): void
    {
        $vet = $this->veterinarian();
        $species = $this->makeSpecies(['category' => 'mammal']);

        $payload = $this->submission($species);
        unset($payload['category']);
        $this->assertRejected($this->submit($vet, $payload), 'category', 'Tipo de animal requerido.');
        $this->assertRejected($this->submit($vet, $this->submission($species, ['category' => ''])), 'category', 'Tipo de animal requerido.');
        $this->assertSame(0, SpeciesPublicationRequest::query()->where('species_id', $species->id)->count());
    }

    /** CA-25 */
    public function test_ca25_store_rejects_category_outside_closed_list(): void
    {
        $vet = $this->veterinarian();
        $species = $this->makeSpecies();

        foreach (['dragon', 'Mammal', 'mamifero'] as $value) {
            $this->assertRejected($this->submit($vet, $this->submission($species, ['category' => $value])), 'category', 'Tipo de animal no válido.');
        }

        foreach (['mammal', 'bird', 'reptile', 'amphibian', 'fish', 'invertebrate'] as $value) {
            $each = $this->makeSpecies();
            $this->submit($vet, $this->submission($each, ['category' => $value]))->assertCreated();
        }
    }

    /** CA-29 */
    public function test_ca29_submit_rejects_common_name_and_creates_no_species(): void
    {
        $vet = $this->veterinarian();
        $species = $this->makeSpecies();
        $speciesCount = Species::withTrashed()->count();
        $requests = SpeciesPublicationRequest::query()->count();

        $this->assertRejected($this->submit($vet, $this->submission($species, ['common_name' => 'Nueva especie'])), 'common_name', 'Campo no permitido: common_name.');
        $this->assertRejected($this->submit($vet, $this->submission($species, ['species' => 'Nueva especie'])), 'species', 'Campo no permitido: species.');

        $this->assertNothingCreated($requests, $speciesCount);
    }
}
