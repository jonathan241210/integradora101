<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Animal extends Model
{
    use SoftDeletes;

    protected $table = 'animals';

    public $timestamps = true;

    const CREATED_AT = null;

    const UPDATED_AT = 'updated_at';

    protected $fillable = [
        'tag_number',
        'responsible_id',
        'name',
        'sex',
        'birth_date',
        'origin',
        'characteristics',
        'photo_path',
        'entry_date',
        'entry_time',
        'enclosure_id',
        'species_id',
        'can_receive_visits',
        'stay_status',
        'updated_at',
    ];

    protected $casts = [
        'birth_date' => 'date:Y-m-d',
        'entry_date' => 'date:Y-m-d',
        'deleted_at' => 'datetime',
    ];

    /**
     * api-028 RN-01: el catálogo público no muestra ejemplares en cuarentena de ingreso.
     */
    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query->where(function (Builder $inner) {
            $inner->whereNull('animals.stay_status')->orWhere('animals.stay_status', '!=', 'Cuarentena_Ingreso');
        });
    }

    public function species(): BelongsTo
    {
        return $this->belongsTo(Species::class, 'species_id');
    }

    public function enclosure(): BelongsTo
    {
        return $this->belongsTo(Enclosure::class);
    }

    /**
     * Obtener la URL pública de la foto del animal.
     * Si no hay foto, retorna null.
     */
    public function getPhotoUrlAttribute(): ?string
    {
        if (! $this->photo_path) {
            return null;
        }

        return asset('storage/'.$this->photo_path);
    }
}
