<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Species extends Model
{
    protected $table = 'species';

    public $timestamps = false;

    public function animals(): HasMany
    {
        return $this->hasMany(Animal::class)->orderBy('id');
    }
}
