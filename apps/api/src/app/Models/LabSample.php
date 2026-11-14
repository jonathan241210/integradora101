<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LabSample extends Model
{
    use SoftDeletes;

    protected $table = 'lab_samples';

    public $timestamps = false;

    protected $guarded = [];
}
