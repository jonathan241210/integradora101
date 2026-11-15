<?php

namespace App\Models;

use App\Enums\MemoryRejectedField;
use App\Enums\MemoryStatus;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Petición de «Momentos para recordar» (api-010, DBR-012).
 *
 * Excepción D-M1 (Constitución V): SoftDeletes sobre Model, sin BaseModel.
 * `status` y `resubmitted_count` solo los fijan las Actions (no son fillable).
 */
class VisitorMemory extends Model
{
    use SoftDeletes;

    protected $table = 'visitor_memories';

    protected $fillable = [
        'visitor_id',
        'opinion',
        'image_path',
        'image_sha256',
        'published_image_path',
        'consent_at',
        'terms_version',
        'rejection_reason',
        'rejected_image',
        'rejected_content',
        'reviewed_by',
        'reviewed_at',
        'published_at',
        'published_until',
    ];

    protected function casts(): array
    {
        return [
            'consent_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'published_at' => 'datetime',
            'published_until' => 'datetime',
            'rejected_image' => 'boolean',
            'rejected_content' => 'boolean',
            'resubmitted_count' => 'integer',
        ];
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class, 'visitor_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(VisitorMemoryReview::class, 'visitor_memory_id');
    }

    /**
     * Visibilidad pública (api-010 RN-03, CA-31): aceptada y con publicación vigente.
     * Las filas con borrado lógico quedan fuera por SoftDeletes.
     */
    public function scopePubliclyVisible(Builder $query, CarbonInterface $now): Builder
    {
        return $query
            ->where('status', MemoryStatus::Accepted->value)
            ->where('published_until', '>', $now);
    }

    public function isPublished(?CarbonInterface $now = null): bool
    {
        return $this->status === MemoryStatus::Accepted->value
            && $this->published_until !== null
            && $this->published_until->greaterThan($now ?? now());
    }

    /** @return list<string> rejected_fields a partir de los dos booleanos (DBR-012). */
    public function rejectedFields(): array
    {
        return array_values(array_filter([
            $this->rejected_image ? MemoryRejectedField::Image->value : null,
            $this->rejected_content ? MemoryRejectedField::Content->value : null,
        ]));
    }
}
