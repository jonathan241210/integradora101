<?php

namespace Tests\Feature\Veterinarian;

use Tests\Feature\SpeciesPublication\SpeciesPublicationTestCase;

class SelectableSpeciesFunFactTest extends SpeciesPublicationTestCase
{
    /** CA-14 species-fun-fact el selector devuelve el dato curioso vigente */
    public function test_ca14_selector_exposes_current_fun_fact_to_veterinarian(): void
    {
        $with = $this->makePublishedSpecies(['fun_fact' => 'Dato curioso vigente de prueba.']);
        $without = $this->makeSpecies();

        $rows = collect($this->actAs($this->veterinarian())->getJson(self::VET_SPECIES)->assertOk()->json('data'))->keyBy('id');
        $this->assertSame('Dato curioso vigente de prueba.', $rows[$with->id]['fun_fact']);
        $this->assertNull($rows[$without->id]['fun_fact']);

        $this->actAs($this->createAccount('admin'))->getJson(self::VET_SPECIES)->assertForbidden();
    }
}
