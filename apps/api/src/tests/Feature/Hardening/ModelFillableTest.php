<?php

namespace Tests\Feature\Hardening;

use App\Models\Animal;
use App\Models\AnimalRestraint;
use App\Models\ClinicalEvaluation;
use App\Models\ClinicalEvaluationFinding;
use App\Models\Department;
use App\Models\LabSample;
use App\Models\Species;
use Tests\TestCase;

/** api-028 · $fillable explícito (CA-10). */
class ModelFillableTest extends TestCase
{
    /** CA-10 pre-delivery-hardening */
    public function test_ca10_clinical_models_declare_explicit_fillable_and_no_open_guarded(): void
    {
        foreach ([Animal::class, Species::class, ClinicalEvaluation::class, ClinicalEvaluationFinding::class, LabSample::class, AnimalRestraint::class, Department::class] as $class) {
            $model = new $class;
            $this->assertNotEmpty($model->getFillable(), "{$class} debe declarar \$fillable.");
            $this->assertNotSame([], $model->getGuarded(), "{$class} no debe usar \$guarded = [].");
            $this->assertTrue($model->isFillable($model->getFillable()[0]));
            $this->assertFalse($model->isFillable('id'), "{$class}: id no es asignable en masa.");
            $this->assertFalse($model->isFillable('deleted_at'), "{$class}: deleted_at no es asignable en masa.");
        }
    }
}
