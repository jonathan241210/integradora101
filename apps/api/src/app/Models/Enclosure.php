<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Enclosure extends Model
{
    protected $table = 'enclosures';

    public $timestamps = false;

    protected $fillable = [
        'name',
        'gps_lat',
        'gps_lon',
        'map_x',
        'map_y',
    ];

    protected $casts = [
        'gps_lat' => 'float',
        'gps_lon' => 'float',
        'map_x' => 'float',
        'map_y' => 'float',
    ];

    public function animals(): HasMany
    {
        return $this->hasMany(Animal::class);
    }
}
