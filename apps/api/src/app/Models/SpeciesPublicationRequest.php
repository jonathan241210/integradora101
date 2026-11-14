<?php

namespace App\Models;

use App\Enums\SpeciesRequestStatus;
use App\Enums\SpeciesRequestType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SpeciesPublicationRequest extends Model
{
    // SoftDeletes over Model (accepted exception, plan 014 decision F).
    use SoftDeletes;

    protected $table = 'species_publication_requests';

    // `status` is set only by Actions; `submitted_species_id` is a generated column.
    protected $fillable = [
        'species_id',
        'request_type',
        'scientific_name',
        'habitat',
        'origin',
        'category',
        'image_path',
        'published_fields',
        'rejection_reason',
        'created_by',
        'updated_by',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => SpeciesRequestStatus::class,
            'request_type' => SpeciesRequestType::class,
            'published_fields' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    public function species(): BelongsTo
    {
        return $this->belongsTo(Species::class, 'species_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
