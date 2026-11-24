<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ZooPlace extends Model
{
    use SoftDeletes;

    protected $table = 'zoo_places';

    protected $fillable = [
        'name',
        'name_original',
        'place_type',
        'gps_lat',
        'gps_lon',
        'map_x',
        'map_y',
        'is_visible',
        'description',
    ];

    protected $casts = [
        'gps_lat' => 'float',
        'gps_lon' => 'float',
        'map_x' => 'float',
        'map_y' => 'float',
        'is_visible' => 'boolean',
        'deleted_at' => 'datetime',
    ];
}