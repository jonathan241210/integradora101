<?php

namespace Tests\Feature\SpeciesPublication;

use App\Models\SpeciesPublicationRequest;

class SubmitFunFactTest extends SpeciesPublicationTestCase
{
    /** CA-04 species-fun-fact sin marcar el texto no se guarda */
    public function test_ca04_text_is_discarded_when_field_not_selected(): void
    {
        $vet = $this->veterinarian();
        $text = str_repeat('a', 30);

        $id = $this->submit($vet, $this->submission($this->makeSpecies(), ['published_fields' => '["habitat"]', 'fun_fact' => $text]))
            ->assertCreated()->json('data.id');
        $this->assertNull(SpeciesPublicationRequest::query()->findOrFail($id)->fun_fact);

        // Default selection does not include the field either.
        $id = $this->submit($vet, $this->submission($this->makeSpecies(), ['fun_fact' => $text]))->assertCreated()->json('data.id');
        $this->assertNull(SpeciesPublicationRequest::query()->findOrFail($id)->fun_fact);

        $id = $this->submit($vet, $this->submission($this->makeSpecies(), ['published_fields' => '["fun_fact"]', 'fun_fact' => $text]))
            ->assertCreated()->json('data.id');
        $this->assertSame($text, SpeciesPublicationRequest::query()->findOrFail($id)->fun_fact);
    }
}
