<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Enclosure extends Model
{
    use SoftDeletes;

    protected $table = 'enclosures';

    public $timestamps = true;

    const CREATED_AT = null;
    const UPDATED_AT = 'updated_at';

    protected $fillable = [
        'name',
        'gps_lat',
        'gps_lon',
        'map_x',
        'map_y',
        'updated_at',
        'deleted_at',
    ];

    protected $casts = [
        'gps_lat' => 'float',
        'gps_lon' => 'float',
        'map_x' => 'float',
        'map_y' => 'float',
        'deleted_at' => 'datetime',
    ];

    public function animals(): HasMany
    {
        return $this->hasMany(Animal::class);
    }
}
