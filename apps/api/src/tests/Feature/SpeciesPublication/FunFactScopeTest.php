<?php

namespace Tests\Feature\SpeciesPublication;

class FunFactScopeTest extends SpeciesPublicationTestCase
{
    private const TEXT = 'Puede correr a sesenta kilómetros por hora.';

    /** CA-13 species-fun-fact sin el campo en listados ni en las respuestas de la app móvil */
    public function test_ca13_fun_fact_absent_from_lists_and_mobile_responses(): void
    {
        $admin = $this->zooAdmin();
        $species = $this->makePublishedSpecies(['published_fields' => ['fun_fact'], 'fun_fact' => self::TEXT]);
        $this->makeRequest($species, $this->veterinarian(), attributes: ['published_fields' => ['fun_fact'], 'fun_fact' => self::TEXT]);

        $this->actAs($admin);
        foreach ([self::ADMIN_PUBLISHED, self::ADMIN_REQUESTS] as $url) {
            $this->getJson($url)->assertOk();
            $this->assertStringNotContainsString('fun_fact', json_encode($this->getJson($url)->json('data')), $url);
        }

        $list = $this->getJson('/api/v1/species')->assertOk()->json();
        $this->assertStringNotContainsString('fun_fact', json_encode($list));
        $this->assertStringNotContainsString('fun_fact', json_encode($this->getJson('/api/v1/species/'.$species->id)->json()));
    }

    /** CA-15 species-fun-fact el detalle muestra el valor actual y el propuesto */
    public function test_ca15_admin_detail_shows_current_and_proposed_fun_fact(): void
    {
        $admin = $this->zooAdmin();
        $species = $this->makePublishedSpecies(['fun_fact' => 'Texto vigente de la especie.']);
        $request = $this->makeRequest($species, $this->veterinarian(), attributes: ['published_fields' => ['fun_fact'], 'fun_fact' => self::TEXT]);

        $this->actAs($admin)->getJson(self::ADMIN_REQUESTS.'/'.$request->id)->assertOk()
            ->assertJsonPath('current.fun_fact', 'Texto vigente de la especie.')
            ->assertJsonPath('proposed.fun_fact', self::TEXT);

        $noProposal = $this->makeRequest($this->makeSpecies(['fun_fact' => 'Solo el valor vigente aquí.']), $this->veterinarian());
        $this->actAs($admin)->getJson(self::ADMIN_REQUESTS.'/'.$noProposal->id)->assertOk()
            ->assertJsonPath('proposed.fun_fact', 'Solo el valor vigente aquí.');

        $this->actAs($admin)->getJson(self::ADMIN_SPECIES.'/'.$species->id.'/publication')->assertOk()
            ->assertJsonPath('fun_fact', 'Texto vigente de la especie.');

        $this->actAs($this->createAccount('cashier'))->getJson(self::ADMIN_REQUESTS.'/'.$request->id)->assertForbidden();
    }
}
