<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * Sin BaseModel por RN-13 de api-019 y ADR 0021 (BaseModel no existe en el repositorio).
 */
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
        'is_active' => 'boolean',
        'deleted_at' => 'datetime',
    ];

    public function animals(): HasMany
    {
        return $this->hasMany(Animal::class);
    }

    public function qrCodes(): HasMany
    {
        return $this->hasMany(EnclosureQrCode::class);
    }

    /**
     * RN-04 (api-019): un recinto es asignable solo si está activo y no eliminado.
     */
    public static function assignableRule(): Exists
    {
        return Rule::exists('enclosures', 'id')
            ->where(fn ($query) => $query->where('is_active', 1)->whereNull('deleted_at'));
    }
}
