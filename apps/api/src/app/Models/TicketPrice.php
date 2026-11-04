<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Precio de boleto con vigencia (api-009). Dato financiero: borrado lógico y auditoría propia
 * (created_by, updated_by y Activitylog desde las Actions). No extiende BaseModel (ADR 0021, excepción a).
 */
class TicketPrice extends Model
{
    use SoftDeletes;

    public const TYPE_ADULT = 'adult';

    public const TYPE_CHILD = 'child';

    public const TYPES = [self::TYPE_ADULT, self::TYPE_CHILD];

    protected $table = 'ticket_prices';

    protected $fillable = ['ticket_type', 'amount', 'effective_at', 'created_by', 'updated_by'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'effective_at' => 'datetime',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
