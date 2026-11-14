<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\ClinicalEvaluation;
use App\Models\Enclosure;
use App\Models\Species;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class ClinicalEvaluationFollowUpTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    private function createAnimalForStaff($staff): Animal
    {
        $enclosure = Enclosure::query()->create([
            'name' => 'Recinto clínico '.bin2hex(random_bytes(5)),
        ]);
        $species = Species::query()->create([
            'common_name' => 'Especie clínica '.bin2hex(random_bytes(5)),
            'scientific_name' => 'Clinica testus',
        ]);

        return Animal::query()->create([
            'tag_number' => 'CE-'.bin2hex(random_bytes(5)),
            'responsible_id' => $staff->id,
            'name' => 'Paciente '.bin2hex(random_bytes(3)),
            'sex' => 'F',
            'birth_date' => '2021-05-10',
            'origin' => 'Rescate',
            'entry_date' => now()->toDateString(),
            'enclosure_id' => $enclosure->id,
            'species_id' => $species->id,
            'stay_status' => 'Cuarentena_Ingreso',
        ]);
    }

    /** CA-01, CA-03 clinical follow-up */
    public function test_ca01_ca03_intense_and_quick_create_new_evaluations_with_mandatory_follow_up(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $animal = $this->createAnimalForStaff($staff);

        $intense = $this->actingAs($staff, 'web')->postJson('/api/v1/staff/clinical-evaluations', [
            'kind' => 'intense',
            'animal_id' => $animal->id,
            'data' => [
                'intense-date' => '2026-11-10',
                'intense-age' => '5 años',
                'intense-presumptive' => 'Diagnóstico presuntivo',
                'intense-vital-temp' => '38',
                'follow_up_status' => 'monitoring',
                'next_review_date' => '2026-11-20',
                'follow_up_reason' => 'routine',
                'is_follow_up' => '1',
            ],
        ])->assertCreated();

        $quick = $this->actingAs($staff, 'web')->postJson('/api/v1/staff/clinical-evaluations', [
            'kind' => 'quick',
            'animal_id' => $animal->id,
            'data' => [
                'quick-date' => '2026-11-11',
                'quick-age' => '5 años 1 mes',
                'quick-diagnosis' => 'Diagnóstico rápido',
                'follow_up_status' => 'stable',
                'next_review_date' => '2026-11-25',
                'follow_up_reason' => 'treatment',
            ],
        ])->assertCreated();

        $intenseId = $intense->json('data.id');
        $quickId = $quick->json('data.id');
        $this->assertNotSame($intenseId, $quickId);

        $this->assertDatabaseHas('clinical_evaluations', [
            'id' => $intenseId,
            'animal_id' => $animal->id,
            'evaluation_type' => 'Historia_Clinica_Completa',
            'evaluation_date' => '2026-11-10',
            'patient_age' => '5 años',
            'follow_up_status' => 'monitoring',
            'next_review_date' => '2026-11-20',
            'is_follow_up' => 1,
        ]);

        $this->assertDatabaseHas('clinical_evaluations', [
            'id' => $quickId,
            'animal_id' => $animal->id,
            'evaluation_type' => 'Revision_Rapida',
            'evaluation_date' => '2026-11-11',
            'patient_age' => '5 años 1 mes',
            'follow_up_status' => 'stable',
            'next_review_date' => '2026-11-25',
            'is_follow_up' => 1,
        ]);

        $this->assertSame(2, ClinicalEvaluation::query()->where('animal_id', $animal->id)->count());
    }

    /** CA-03 clinical follow-up validation */
    public function test_ca03_follow_up_fields_are_required_and_status_must_be_valid(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $animal = $this->createAnimalForStaff($staff);
        $base = [
            'kind' => 'quick',
            'animal_id' => $animal->id,
            'data' => [
                'quick-date' => '2026-11-12',
                'quick-diagnosis' => 'Dx',
            ],
        ];

        $this->actingAs($staff, 'web')
            ->postJson('/api/v1/staff/clinical-evaluations', $base)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['data.follow_up_status', 'data.next_review_date', 'data.follow_up_reason']);

        $invalid = $base;
        $invalid['data']['follow_up_status'] = 'invalid';
        $invalid['data']['next_review_date'] = '2026-11-30';
        $invalid['data']['follow_up_reason'] = 'routine';

        $this->actingAs($staff, 'web')
            ->postJson('/api/v1/staff/clinical-evaluations', $invalid)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['data.follow_up_status']);
    }

    /** CA-05 clinical follow-up history exposure */
    public function test_ca05_animal_profile_exposes_follow_up_fields_in_history(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $animal = $this->createAnimalForStaff($staff);

        $this->actingAs($staff, 'web')->postJson('/api/v1/staff/clinical-evaluations', [
            'kind' => 'quick',
            'animal_id' => $animal->id,
            'data' => [
                'quick-date' => '2026-11-13',
                'quick-age' => '2 años',
                'quick-diagnosis' => 'Control',
                'follow_up_status' => 'follow_up',
                'next_review_date' => '2026-12-01',
                'follow_up_reason' => 'observation',
            ],
        ])->assertCreated();

        $this->actingAs($staff, 'web')
            ->getJson("/api/v1/staff/animals/{$animal->id}")
            ->assertOk()
            ->assertJsonPath('data.evaluations.0.follow_up_status', 'follow_up')
            ->assertJsonPath('data.evaluations.0.next_review_date', '2026-12-01')
            ->assertJsonPath('data.evaluations.0.is_follow_up', 1)
            ->assertJsonPath('data.evaluations.0.patient_age', '2 años');
    }
}
