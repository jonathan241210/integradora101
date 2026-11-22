<?php

namespace Tests\Feature\SpeciesPublication;

class RepublishFunFactTest extends SpeciesPublicationTestCase
{
    /** CA-09 species-fun-fact republicar exige un dato curioso válido si está seleccionado */
    public function test_ca09_republish_requires_valid_fun_fact_when_selected(): void
    {
        $admin = $this->zooAdmin();
        $species = $this->makeUnpublishedSpecies(['published_fields' => ['habitat', 'fun_fact'], 'fun_fact' => 'corto']);
        $url = self::ADMIN_SPECIES.'/'.$species->id.'/republish';

        $this->actAs($admin)->postJson($url)->assertUnprocessable()
            ->assertJsonPath('errors.fun_fact.0', 'Falta el dato curioso (mínimo 20 caracteres). Complétalo antes de republicar.');
        $this->assertFalse($species->fresh()->is_published);

        $species->fun_fact = str_repeat('a', 25);
        $species->save();
        $this->actAs($admin)->postJson($url)->assertOk();
        $this->assertTrue($species->fresh()->is_published);

        // Not selected: the text is irrelevant.
        $other = $this->makeUnpublishedSpecies(['published_fields' => ['habitat']]);
        $this->actAs($admin)->postJson(self::ADMIN_SPECIES.'/'.$other->id.'/republish')->assertOk();
    }

    /** CA-10 species-fun-fact eliminar la publicación conserva el texto pero lo oculta */
    public function test_ca10_delete_keeps_fun_fact_hidden_from_public(): void
    {
        $admin = $this->zooAdmin();
        $text = str_repeat('b', 25);
        $species = $this->makePublishedSpecies(['published_fields' => ['fun_fact'], 'fun_fact' => $text]);

        $this->actAs($admin)->deleteJson(self::ADMIN_SPECIES.'/'.$species->id.'/publication')->assertOk();

        $this->assertSame($text, $species->fresh()->fun_fact);
        $public = $this->getJson('/api/v1/published-species')->assertOk()->json('data');
        $this->assertNotContains($species->id, array_column($public, 'id'));
        $this->assertStringNotContainsString($text, json_encode($public));
    }
}
