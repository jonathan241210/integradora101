<?php

namespace Tests\Feature\SpeciesPublication;

use Spatie\Activitylog\Models\Activity;

class UnpublishedFunFactTest extends SpeciesPublicationTestCase
{
    /** CA-08 species-fun-fact edición de especie despublicada */
    public function test_ca08_unpublished_species_sheet_validates_fun_fact(): void
    {
        $admin = $this->zooAdmin();
        $species = $this->makeUnpublishedSpecies();
        $url = self::ADMIN_SPECIES.'/'.$species->id.'/publication';
        $text = 'Puede saltar tres veces su altura.';

        $this->actAs($admin)->patchJson($url, ['published_fields' => ['fun_fact'], 'fun_fact' => 'corto'])
            ->assertUnprocessable()->assertJsonPath('errors.fun_fact.0', 'Dato curioso: escribe al menos 20 caracteres.');
        $this->actAs($admin)->patchJson($url, ['published_fields' => ['fun_fact'], 'fun_fact' => str_repeat('a', 501)])
            ->assertUnprocessable()->assertJsonPath('errors.fun_fact.0', 'Dato curioso: máximo 500 caracteres.');
        $this->assertNull($species->fresh()->fun_fact);

        $this->actAs($admin)->patchJson($url, ['published_fields' => ['fun_fact'], 'fun_fact' => " {$text} "])
            ->assertOk()->assertJsonPath('fun_fact', $text);
        $this->assertSame($text, $species->fresh()->fun_fact);

        $log = Activity::query()->where('subject_id', $species->id)->where('event', 'species_publication.unpublished_edited')->latest('id')->first();
        $this->assertNull($log->properties['old']['fun_fact']);
        $this->assertSame($text, $log->properties['new']['fun_fact']);

        // Unselecting discards the text.
        $this->actAs($admin)->patchJson($url, ['published_fields' => ['habitat']])->assertOk();
        $this->assertNull($species->fresh()->fun_fact);
    }
}
