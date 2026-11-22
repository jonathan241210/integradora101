<?php

namespace Tests\Feature\SpeciesPublication;

class AcceptFunFactTest extends SpeciesPublicationTestCase
{
    /** CA-07 species-fun-fact aceptar copia el dato curioso a la especie */
    public function test_ca07_accept_copies_fun_fact_to_species(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $text = 'Su lengua mide hasta cuarenta centímetros.';

        $species = $this->makeSpecies();
        $request = $this->makeRequest($species, $vet, attributes: ['published_fields' => ['fun_fact'], 'fun_fact' => $text]);
        $this->actAs($admin)->postJson(self::ADMIN_REQUESTS.'/'.$request->id.'/accept')->assertOk()
            ->assertJsonPath('fun_fact', $text);
        $this->assertSame($text, $species->fresh()->fun_fact);

        // A later request without the field copies NULL (RN-03).
        $request = $this->makeRequest($species->fresh(), $vet, attributes: ['published_fields' => ['habitat']]);
        $this->actAs($admin)->postJson(self::ADMIN_REQUESTS.'/'.$request->id.'/accept', ['publish' => true])->assertOk();
        $this->assertNull($species->fresh()->fun_fact);
    }
}
