<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Historial append-only de decisiones de revisión (api-010, DBR-012).
 * Excepción D-M1: SoftDeletes sobre Model, sin BaseModel. No se actualiza ni se borra.
 */
class VisitorMemoryReview extends Model
{
    use SoftDeletes;

    protected $table = 'visitor_memory_reviews';

    protected $fillable = [
        'visitor_memory_id',
        'decision',
        'rejection_reason',
        'rejected_image',
        'rejected_content',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
            'rejected_image' => 'boolean',
            'rejected_content' => 'boolean',
        ];
    }

    public function memory(): BelongsTo
    {
        return $this->belongsTo(VisitorMemory::class, 'visitor_memory_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
