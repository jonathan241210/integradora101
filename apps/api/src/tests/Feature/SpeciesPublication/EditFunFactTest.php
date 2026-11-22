<?php

namespace Tests\Feature\SpeciesPublication;

use App\Models\SpeciesPublicationRequest;
use Spatie\Activitylog\Models\Activity;

class EditFunFactTest extends SpeciesPublicationTestCase
{
    private const TEXT = 'Duerme hasta veinte horas al día.';

    /** CA-05 species-fun-fact el PATCH valida el estado final */
    public function test_ca05_patch_validates_fun_fact_on_final_state(): void
    {
        $admin = $this->zooAdmin();
        $request = $this->makeRequest($this->makeSpecies(), $this->veterinarian());
        $url = self::ADMIN_REQUESTS.'/'.$request->id;

        // Adding the field without text: 422 and nothing changes.
        $this->actAs($admin)->patchJson($url, ['published_fields' => ['fun_fact']])
            ->assertUnprocessable()->assertJsonPath('errors.fun_fact.0', 'Dato curioso: escribe al menos 20 caracteres.');
        $this->assertNull($request->fresh()->fun_fact);

        // Adding the field with valid text.
        $this->actAs($admin)->patchJson($url, ['published_fields' => ['fun_fact'], 'fun_fact' => '  '.self::TEXT.' '])->assertOk();
        $this->assertSame(self::TEXT, $request->fresh()->fun_fact);

        // Editing only the text keeps the selection (final state comes from the row).
        $this->actAs($admin)->patchJson($url, ['fun_fact' => 'corto'])->assertUnprocessable();
        $this->actAs($admin)->patchJson($url, ['habitat' => 'Selva'])->assertOk();
        $this->assertSame(self::TEXT, $request->fresh()->fun_fact);
        $this->assertSame('submitted', $request->fresh()->status->value);

        // Removing the field discards the text.
        $this->actAs($admin)->patchJson($url, ['published_fields' => ['habitat']])->assertOk();
        $this->assertNull($request->fresh()->fun_fact);
    }

    /** CA-06 species-fun-fact la auditoría guarda el valor anterior y el nuevo */
    public function test_ca06_fun_fact_change_is_audited_with_before_and_after(): void
    {
        $admin = $this->zooAdmin();
        $request = $this->makeRequest($this->makeSpecies(), $this->veterinarian(), attributes: [
            'published_fields' => ['fun_fact'],
            'fun_fact' => self::TEXT,
        ]);
        $url = self::ADMIN_REQUESTS.'/'.$request->id;
        $edits = fn () => Activity::query()
            ->where('subject_type', SpeciesPublicationRequest::class)
            ->where('subject_id', $request->id)
            ->where('event', 'species_publication.edited');

        $newText = 'Reconoce a su cuidador por la voz.';
        $this->actAs($admin)->patchJson($url, ['fun_fact' => $newText])->assertOk();
        $log = $edits()->first();
        $this->assertSame(self::TEXT, $log->properties['old']['fun_fact']);
        $this->assertSame($newText, $log->properties['new']['fun_fact']);

        $this->actAs($admin)->patchJson($url, ['fun_fact' => " {$newText} "])->assertOk();
        $this->assertSame(1, $edits()->count());
    }
}
