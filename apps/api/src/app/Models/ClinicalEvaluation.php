<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClinicalEvaluation extends Model
{
    protected $table = 'clinical_evaluations';

    public $timestamps = false;

    protected $guarded = [];

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
