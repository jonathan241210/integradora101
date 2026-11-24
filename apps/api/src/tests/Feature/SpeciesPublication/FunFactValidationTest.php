<?php

namespace Tests\Feature\SpeciesPublication;

use App\Models\SpeciesPublicationRequest;

class FunFactValidationTest extends SpeciesPublicationTestCase
{
    private function text(int $length): string
    {
        return str_repeat('ñ', $length);
    }

    /** CA-02 species-fun-fact obligatorio y mínimo de 20 cuando se muestra */
    public function test_ca02_required_and_min_20_when_selected(): void
    {
        $vet = $this->veterinarian();
        $species = $this->makeSpecies();
        $fields = '["scientific_name","fun_fact"]';

        foreach ([null, $this->text(19), '   '.$this->text(19).'   '] as $text) {
            $payload = ['published_fields' => $fields] + ($text === null ? [] : ['fun_fact' => $text]);
            $this->submit($vet, $this->submission($species, $payload))
                ->assertUnprocessable()
                ->assertJsonPath('errors.fun_fact.0', 'Dato curioso: escribe al menos 20 caracteres.');
        }

        $this->submit($vet, $this->submission($species, ['published_fields' => $fields, 'fun_fact' => $this->text(20)]))
            ->assertCreated();

        // PATCH: final state without text is rejected and nothing changes.
        $admin = $this->zooAdmin();
        $request = $this->makeRequest($this->makeSpecies(), $vet);
        $this->actAs($admin)->patchJson(self::ADMIN_REQUESTS.'/'.$request->id, ['published_fields' => ['fun_fact'], 'fun_fact' => $this->text(19)])
            ->assertUnprocessable()
            ->assertJsonPath('errors.fun_fact.0', 'Dato curioso: escribe al menos 20 caracteres.');
        $this->assertSame(['scientific_name', 'origin', 'habitat'], $request->fresh()->published_fields);
    }

    /** CA-03 species-fun-fact máximo de 500 y texto plano recortado */
    public function test_ca03_max_500_plain_text_trimmed(): void
    {
        $vet = $this->veterinarian();
        $fields = '["fun_fact"]';

        $this->submit($vet, $this->submission($this->makeSpecies(), ['published_fields' => $fields, 'fun_fact' => $this->text(501)]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.fun_fact.0', 'Dato curioso: máximo 500 caracteres.');

        $this->submit($vet, $this->submission($this->makeSpecies(), ['published_fields' => $fields, 'fun_fact' => ['x']]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.fun_fact.0', 'Dato curioso: texto no válido.');

        $html = '<script>x</script> '.$this->text(20);
        $id = $this->submit($vet, $this->submission($this->makeSpecies(), ['published_fields' => $fields, 'fun_fact' => "  {$html}  "]))
            ->assertCreated()->json('data.id');
        $this->assertSame($html, SpeciesPublicationRequest::query()->findOrFail($id)->fun_fact);

        $this->submit($vet, $this->submission($this->makeSpecies(), ['published_fields' => $fields, 'fun_fact' => $this->text(500)]))
            ->assertCreated();

        $this->submit($vet, $this->submission($this->makeSpecies(), ['published_fields' => '["fun_fact","bogus"]', 'fun_fact' => $this->text(20)]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.published_fields.0', 'Campo no permitido en la ficha pública: bogus.');
    }

    /** CA-01 species-fun-fact una clave desconocida responde 422 con su mensaje */
    public function test_ca01_unknown_published_field_returns_422_with_message(): void
    {
        $vet = $this->veterinarian();

        $this->submit($vet, $this->submission($this->makeSpecies(), ['published_fields' => '["fun_fact","bogus"]', 'fun_fact' => $this->text(20)]))
            ->assertUnprocessable()
            ->assertJsonPath('errors.published_fields.0', 'Campo no permitido en la ficha pública: bogus.');
        $this->assertSame(0, SpeciesPublicationRequest::query()->where('fun_fact', $this->text(20))->count());
    }
}
