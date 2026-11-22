<?php

namespace App\Models;

use App\Enums\TicketCancellationReason;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Boleto vendido en taquilla (api-009). Dato financiero: borrado lógico y auditoría propia
 * (cashier_id como creador, updated_by, cancelled_by y Activitylog desde las Actions).
 * No extiende BaseModel por la excepción a de ADR 0021.
 */
class Ticket extends Model
{
    use SoftDeletes;

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    protected $table = 'tickets';

    public $timestamps = false;

    protected $fillable = [
        'adult_quantity',
        'child_quantity',
        'status',
        'payment_method',
        'adult_unit_price',
        'child_unit_price',
        'total_amount',
        'purchased_at',
        'cancelled_at',
        'cancelled_by',
        'cancellation_reason_code',
        'cancellation_reason',
        'updated_by',
        'qr_code',
        'cashier_id',
    ];

    protected $hidden = ['qr_code'];

    protected function casts(): array
    {
        return [
            'adult_quantity' => 'integer',
            'child_quantity' => 'integer',
            'adult_unit_price' => 'decimal:2',
            'child_unit_price' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'purchased_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'cancellation_reason_code' => TicketCancellationReason::class,
        ];
    }

    /** Boletos que cuentan en reportes y totales (api-009 RN-18). */
    public function scopeCompleted(Builder $query): void
    {
        $query->where('status', self::STATUS_COMPLETED);
    }

    /** Incluye cuentas eliminadas lógicamente: el nombre es registro histórico (api-022 RN-12). */
    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id')->withTrashed();
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by')->withTrashed();
    }
}
