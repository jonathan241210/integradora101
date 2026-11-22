<?php

namespace App\Models;

use App\Enums\CancellationReviewStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Historial append-only de revisiones de cancelaciones por cajero y día (api-027, DBR-026). La vigente es la de
 * mayor `id` del par. SoftDeletes por norma (Constitución V), sin ruta que borre ni actualice. Sin BaseModel,
 * igual que VisitorMemoryReview: la autoría es `reviewed_by`.
 */
class CancellationReview extends Model
{
    use SoftDeletes;

    protected $table = 'cancellation_reviews';

    protected $fillable = ['cashier_id', 'business_date', 'status', 'note', 'reviewed_by'];

    protected function casts(): array
    {
        return [
            'business_date' => 'date:Y-m-d',
            'status' => CancellationReviewStatus::class,
        ];
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id')->withTrashed();
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by')->withTrashed();
    }
}
