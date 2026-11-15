<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AnimalRestraint extends Model
{
    use SoftDeletes;

    protected $table = 'animal_restraints';

    public $timestamps = false;

    protected $guarded = [];
}
