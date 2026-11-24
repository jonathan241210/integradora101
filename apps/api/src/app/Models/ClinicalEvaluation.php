<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClinicalEvaluation extends Model
{
    use SoftDeletes;

    protected $table = 'clinical_evaluations';

    public $timestamps = false;

    protected $fillable = [
        'animal_id',
        'veterinarian_id',
        'evaluation_type',
        'evaluation_reason',
        'destination_ruling',
        'follow_up_status',
        'assessment_reason',
        'evaluation_date',
        'start_time',
        'end_time',
        'temperature_c',
        'heart_rate',
        'respiratory_rate',
        'capillary_refill_time',
        'weight_kg',
        'patient_age',
        'attitude',
        'body_condition_score',
        'presumptive_diagnosis',
        'definitive_diagnosis',
        'recommendations',
        'is_fit_for_wild_release',
        'next_review_date',
        'is_follow_up',
    ];

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class, 'animal_id');
    }

    public function findings(): HasMany
    {
        return $this->hasMany(ClinicalEvaluationFinding::class, 'clinical_evaluation_id');
    }

    public function restraints(): HasMany
    {
        return $this->hasMany(AnimalRestraint::class, 'clinical_evaluation_id');
    }

    public function labSamples(): HasMany
    {
        return $this->hasMany(LabSample::class, 'clinical_evaluation_id');
    }
}
