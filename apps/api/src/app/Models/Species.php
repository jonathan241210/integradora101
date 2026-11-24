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

    protected $fillable = [
        'common_name',
        'scientific_name',
        'category',
        'distribution',
        'conservation_status',
        'habitat',
        'fun_fact',
        'feeding',
        'longevity',
        'reproduction',
        'gestation_period',
        'size_cm',
        'model_3d_path',
        'is_published',
        'published_at',
        'unpublished_at',
        'image_path',
        'published_fields',
    ];

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
