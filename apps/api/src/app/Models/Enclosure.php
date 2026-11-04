<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Enclosure extends Model
{
    protected $table = 'enclosures';

    public $timestamps = false;

    public function animals(): HasMany
    {
        return $this->hasMany(Animal::class);
    }
}
