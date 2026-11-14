<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClinicalEvaluationFinding extends Model
{
    use SoftDeletes;

    protected $table = 'clinical_evaluation_findings';

    public $timestamps = false;

    protected $guarded = [];
}
