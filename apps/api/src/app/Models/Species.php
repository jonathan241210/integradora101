<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Species extends Model
{
    // SoftDeletes over Model (accepted exception, plan 014 decision F).
    use SoftDeletes;

    protected $table = 'species';

    public $timestamps = false;

    // Kept open until AnimalController::store (firstOrCreate) is reviewed.
    // Actions assign explicit attributes; request data is never mass-assigned.
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'published_at' => 'datetime',
            'unpublished_at' => 'datetime',
            'published_fields' => 'array',
        ];
    }

    public function animals(): HasMany
    {
        return $this->hasMany(Animal::class)->orderBy('id');
    }

    public function publicationRequests(): HasMany
    {
        return $this->hasMany(SpeciesPublicationRequest::class, 'species_id');
    }
}
