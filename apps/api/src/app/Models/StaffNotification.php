<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Aviso interno al personal (tabla `staff_notifications`). api-023 lo reutiliza para avisar a los administradores
 * de cambios hechos desde la consola (tipo `console_admin_change`).
 *
 * Sin SoftDeletes ni BaseModel: excepción b) del ADR 0021, revisada para api-023 (Q7, 2026-11-20).
 */
class StaffNotification extends Model
{
    public const TYPE_CONSOLE_ADMIN_CHANGE = 'console_admin_change';

    protected $table = 'staff_notifications';

    protected $fillable = ['user_id', 'type', 'payload', 'ticket_price_id', 'created_by', 'read_at', 'acknowledged_at'];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'read_at' => 'datetime',
            'acknowledged_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
