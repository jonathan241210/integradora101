<?php

namespace App\Models;

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

    protected $guarded = [];

    protected $casts = [
        'birth_date' => 'date:Y-m-d',
        'entry_date' => 'date:Y-m-d',
        'deleted_at' => 'datetime',
    ];

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

        return asset('storage/' . $this->photo_path);
    }
}

