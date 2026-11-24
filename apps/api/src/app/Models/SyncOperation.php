<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyncOperation extends Model
{
    protected $table = 'sync_operations';

    protected $fillable = [
        'operation_uuid',
        'user_id',
        'entity_type',
        'client_entity_id',
        'server_entity_type',
        'server_entity_id',
        'status',
        'error_code',
        'error_message',
        'processed_at',
    ];

    protected $casts = [
        'processed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
