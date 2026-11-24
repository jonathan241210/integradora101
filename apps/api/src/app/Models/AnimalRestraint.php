<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AnimalRestraint extends Model
{
    use SoftDeletes;

    protected $table = 'animal_restraints';

    public $timestamps = false;

    protected $fillable = [
        'clinical_evaluation_id',
        'mobilization_type',
        'physical_method',
        'drug',
        'dose_mg_per_kg',
        'dose_ml',
        'administered_time',
        'notes',
    ];
}
