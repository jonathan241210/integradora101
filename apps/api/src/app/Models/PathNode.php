<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PathNode extends Model
{
    use SoftDeletes;

    protected $table = 'path_nodes';

    protected $fillable = [
        'name',
        'node_type',
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
        'deleted_at' => 'datetime',
    ];
}