<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Preferencias de aviso del visitante (api-017, DBR-017).
 * Excepción RN-12: sin BaseModel ni SoftDeletes. Se borra con la cuenta.
 */
class VisitorNotificationPreference extends Model
{
    protected $table = 'visitor_notification_preferences';

    protected $primaryKey = 'visitor_id';

    public $incrementing = false;

    protected $fillable = [
        'visitor_id',
        'news_and_events',
        'memory_status',
    ];

    protected function casts(): array
    {
        return [
            'news_and_events' => 'boolean',
            'memory_status' => 'boolean',
        ];
    }
}
