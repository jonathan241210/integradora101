<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pareja cuenta–especie de los favoritos (api-018, DBR-018).
 * Excepción ya aceptada: sin BaseModel ni SoftDeletes. Se borra con la cuenta.
 */
class VisitorFavoriteSpecies extends Model
{
    protected $table = 'visitor_favorite_species';

    protected $fillable = [
        'visitor_id',
        'species_id',
    ];

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }

    public function species(): BelongsTo
    {
        return $this->belongsTo(Species::class);
    }
}
